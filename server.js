const { createCanvas } = require('canvas');
const cfg = require('./cfg.json');
const { MongoClient } = require('mongodb');
const DiscordOauth2 = require("discord-oauth2");
const express = require('express');
const path = require('path');
const { NOTINITIALIZED } = require('dns');

const app = express();
var previousAction = [];
app.use(express.static(path.resolve(path.join(__dirname, '/public'))));

const oauth = new DiscordOauth2({
    clientId: cfg.id,
    clientSecret: cfg.secert,

    redirectUri: "https://tanktactics.uc.r.appspot.com/authorize",
});



const uri = "mongodb+srv://storage:" + cfg.db + "@cluster0.rqdvk.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
client.connect(err => {
    const collection = client.db("Game").collection("save");
    const userCollection = client.db("Game").collection("user");
    console.log("Connected To db");

    //apis
    app.get('/', (req, res) => {

    });

    app.get('/authorize', (req, res) => {

        oauth.tokenRequest({
            code: req.query.code,
            scope: 'identify email',
            grantType: 'authorization_code',
        }).then(code => {
            res.redirect('/user?code=' + code.access_token);
        }).catch((e) => {
        });

    });
    app.get('/user', (req, res) => {
        oauth.getUser(req.query.code).then((resp) => { res.redirect('/game.html?userId=' + resp.id); });
    });

    app.get('/stats', (req, res) => {
        userCollection.findOne({ "userId": req.query.userId }).then(user => {
            res.send(user);
        });
    });

    app.get('/leaderboard', (req, res) => {
        userCollection.find().sort({ "wins": -1 }).limit(10).then(leaderboard => { res.send(leaderboard); });
      
    });

    app.get('/data', (req, res) => {

        getGameById(req.query.channelId).then(game => { res.setHeader("Access-Control-Allow-Origin", "*").send(game); });
    });

    app.get('/join', (req, res) => {
        getGameById(req.query.channelId).then(game => {
            console.log("joining user");

            join(req.query.channelId, req.query.userId, req.query.name, req.query.channelName, req.query.serverName, game).then(action => {
                res.send(action);
            });
        });
    });

    app.get('/bot', (req, res) => {

        if (req.query.key == cfg.bot) {
            var actions = previousAction;
            previousAction = [];
            res.send(actions);
        }
    });


    app.get('/move', (req, res) => {
        getGameById(req.query.channelId).then(game => {
            var action = UpdateGameMovement(game, req.query.userId, req.query.move, req.query.id);
            if (typeof req.query.bot == 'undefined') {
                var actionSave = { "code": action.code, "message": action.message, "channelId": req.query.channelId };
                if (actionSave.code != 405) {
                    previousAction.push(actionSave);
                }

            }
            res.setHeader("Access-Control-Allow-Origin", "*").send(action);
        });
    });

    app.get('/image', (req, res) => {
        res.setHeader('Content-Type', 'image/png');
        getGameById(req.query.channelId).then(game => {
            DrawNodeJS(game).pngStream().pipe(res);
        });
    });

    app.get('/games', (req, res) => {
        getGames(req.query.userId).then(lobbies => {
            res.setHeader("Access-Control-Allow-Origin", "*").send(lobbies);
        });
    });

    const PORT = process.env.PORT || 8080;
    app.listen(PORT, () => {
        console.log("Starting server!!!");
        calculateActionPoints();
    });


    async function calculateActionPoints() {
        console.log("Calculating action points");
        collection.find({}).toArray(function (err, games) {
            games.forEach((game) => {
                if (game.gameRunning) {
                    game.users.forEach(user => {
                        alivePeople = 0;
                        game.users.forEach(checkUserHealth => {
                            if (checkUserHealth.health > 0) {
                                alivePeople++;
                            }
                        });

                        if (alivePeople == 1) {
                            collection.deleteOne({ "channelId": game.channelId }, function (err, obj) {
                                if (err) throw err;

                                console.log("1 document deleted");
                            });
                        }
                        user.hour++;
                        if ((Math.random() * 14) < user.hour) {
                            user.hour = 0;
                            user.actionPoints++;
                            previousAction.push({ "code": 200, "message": user.name + " has gotten an action point.", "channelId": game.channelId })
                        };

                    });
                    saveGame(game);
                }
            });
        });
        setTimeout(calculateActionPoints, 1000 * 60 * 60);
    }


    //channels
    async function getAllChannels() {
        var channelids = [];
        const cursor = collection.find({});
        while (await cursor.hasNext()) {
            const doc = await cursor.next();
            channelids.push(doc.channelId);
        }
        return channelids;
    }

    //Users functions
    function createUser(id, name, playerId, x, y) {
        var user = {
            "id": id,
            "color": {
                "emote": "",
                "color": ""
            },
            "name": name,
            "x": x,
            "y": y,
            "actionPoints": 1,
            "hour": 0,
            "health": 3,
            "lastAttack": 0,
            "accuracy": 80,
            "playerId": playerId,
        }
        if (playerId == 0) {
            user.color.emote = ":blue_circle:";
            user.color.color = "#00eeff";
        } else if (playerId == 1) {
            user.color.emote = ":black_circle:";
            user.color.color = "#000000";
        } else if (playerId == 2) {
            user.color.emote = ":green_circle:";
            user.color.color = "#22ff00";
        } else if (playerId == 3) {
            user.color.emote = ":orange_circle:";
            user.color.color = "#fa6c00";
        } else if (playerId == 4) {
            user.color.emote = ":purple_circle:";
            user.color.color = "#b300ff";
        } else if (playerId == 5) {
            user.color.emote = ":red_circle:";
            user.color.color = "#ff1100";
        } else if (playerId == 6) {
            user.color.emote = ":yellow_circle:";
            user.color.color = "#ffea00";
        } else if (playerId == 7) {
            user.color.emote = ":white_circle:";
            user.color.color = "#ffffff";
        }

        return user;
    }


    function getUserById(game, userId) {
        var userToReturn;
        game.users.forEach(function (user) { if (userId == user.id || Number(userId) == user.playerId) { userToReturn = user; } });
        return userToReturn;
    }

    function containsUser(game, userId) {
        var userThere = false;
        if (typeof game.users != 'undefined') {
            game.users.forEach((user) => {
                if (user.id == userId) {
                    userThere = true;
                }
            });
        }
        return userThere;
    }
    //Game Function
    function createGame(channelId, channelName, serverName) {
        return {
            "users": [], "channelId": channelId, "id": 0, "gameRunning": false, "channelName": channelName, "serverName": serverName, "boardSize": 32
        }
    }

    function saveGame(game) {
        collection.updateOne({
            "channelId": game.channelId
        }, {
            $set: game
        }, function (err, res) {
            if (err) console.log(err);
            console.log("game updated: " + game.channelId);
        }
        );
    }

    function saveGame(game, channelId) {
        collection.updateOne({
            "channelId": game.channelId
        }, {
            $set: game
        }, function (err, res) {
            if (err) console.log(err);
            console.log("game updated: " + game.channelId);
        }
        );
    }

    async function getGameById(channelId) {
        var game = await collection.findOne({ "channelId": channelId });
        return game;
    }

    function createUserStats(userId) {
        return {
            "userId": userId,
            "wins": 0,
            "kills": 0,
            "deaths": 0,
            "apGiven": 0,
            "apRecived":0
        }
    }

    //API main function
    async function getGames(userId) {
        var lobbies = [];
        const cursor = collection.find({});
        while (await cursor.hasNext()) {
            const game = await cursor.next();
            if (containsUser(game, userId)) {
                lobbies.push({ "channelId": game.channelId, "channelName": game.channelName, "serverName": game.serverName });
            }
        }
        return lobbies;
    }


    function DrawNodeJS(game) {
        const width = game.boardSize * 2 * 10 + 10;
        const height = game.boardSize * 2 * 10 + 10;

        const canvas = createCanvas(width, height);
        const context = canvas.getContext('2d');

        context.fillStyle = '#343a40';
        context.fillRect(0, 0, width, height)

        context.fillStyle = '#a39c93';
        for (var x = 0; x < game.boardSize; x++) {

            for (var y = 0; y < game.boardSize; y++) {
                context.fillRect(x * 20 + 10, y * 20 + 10, 10, 10);
            }

        }
        game.users.forEach((user) => {
            if (user.health > 0) {
                context.fillStyle = user.color.color;
                context.fillRect(user.x * 20 - 1.5, user.y * 20 - 1.5, 13, 13);
            }
        });
        return canvas;

    }


    async function UpdateGameMovement(game, userId, move, id) {
        userId = Number(userId);
        id = Number(id);
        var user = getUserById(game, userId);
        var response = { code: 200, message: "", game: null };
        if (game.gameRunning) {
            if (user.actionPoints > 0) {
                if (move.toLowerCase() == "up") {
                    if (user.health > 0) {
                        if (user.y > 0) {
                            user.y--;
                            response.message = user.name + " has moved.";
                        } else {
                            response.code = 405;
                            response.message = "Reached edge of Map.";
                        }
                    } else {
                        response.code = 405;
                        response.message = "Dead people can not move.";
                    }
                }
                if (move.toLowerCase() == "down") {
                    if (user.health > 0) {
                        if (user.y < game.boardSize - 1) {
                            user.y++;
                            response.message = user.name + " has moved.";
                        } else {
                            response.code = 405;
                            response.message = "Reached edge of Map.";
                        }
                    } else {
                        response.code = 405;
                        response.message = "Dead people can not move.";
                    }
                }

                if (move.toLowerCase() == "right") {
                    var user = getUserById(game, userId);
                    if (user.health > 0) {
                        if (user.x < game.boardSize - 1) {
                            user.x++;
                            response.message = user.name + " has moved.";
                        } else {
                            response.code = 405;
                            response.message = "Reached edge of Map.";
                        }
                    } else {
                        response.code = 405;
                        response.message = "Dead people can not move.";
                    }
                }
                if (move.toLowerCase() == "left") {
                    var user = getUserById(game, userId);
                    if (user.health > 0) {
                        if (user.x > 0) {
                            user.x--;
                            response.message = user.name + " has moved.";
                        } else {
                            response.code = 405;
                            response.message = "Reached edge of Map.";
                        }
                    } else {
                        response.code = 405;
                        response.message = "Dead people can not move.";
                    }
                }
                if (move.toLowerCase() == "attack") {
                    var user = getUserById(game, userId);
                    if (Date.now() > user.lastAttack + 1000 * 60 * 15) {
                        var enemy = getUserById(game, id);
                        if (user.health > 0) {
                            if (typeof enemy != "undefined") {

                                if (enemy.health > 0) {
                                    if (enemy.x == user.x || enemy.y == user.y) {
                                        if (Math.random() * 100 < user.accuracy) {
                                            enemy.health--;
                                            user.lastAttack = Date.now();
                                            if (enemy.health == 0) {
                                                var userStats = await userCollection.findOne({ "userId": user.id });
                                                var enemyStats = await userCollection.findOne({ "userId": enemy.id });

                                               
                                                if (userStats === null) {
                                                    userStats = createUserStats(user.id);
                                                    userCollection.insertOne(userStats, function (err, res) {
                                                        if (err) console.log(err);
                                                    }
                                                    );
                                                }

                                                if (enemyStats === null) {
                                                    enemyStats = createUserStats(enemy.id);
                                                    userCollection.insertOne(enemyStats, function (err, res) {
                                                        if (err) console.log(err);
                                                       
                                                    }
                                                    );
                                                }

                                                userStats.kills++;
                                                enemyStats.deaths++;

                                                alivePeople = 0;
                                                game.users.forEach(checkUserHealth => {
                                                    if (checkUserHealth.health > 0) {
                                                        alivePeople++;
                                                    }
                                                });

                                                response.message = user.name + " has killed " + enemy.name;
                                                if (alivePeople == 1) {
                                                    userStats.wins++;
                                                    response.code = 100;
                                                    response.message = user.name + " has killed " + enemy.name + " and has won.";
                                                }
                                                userCollection.updateOne({ "userId": user.id }, {
                                                    $set: userStats
                                                }, function (err, res) {
                                                    if (err) console.log(err);
                                                    console.log("game updated: " + game.channelId);
                                                }
                                                );
                                                userCollection.updateOne({ "userId": enemy.id }, {
                                                    $set: enemyStats
                                                }, function (err, res) {
                                                    if (err) console.log(err);
                                                    console.log("game updated: " + game.channelId);
                                                }
                                                );

                                            } else {

                                                response.message = user.name + " has attacked " + enemy.name;
                                            }
                                        } else {
                                            response.code = 405;
                                            response.message = user.name + " has tried to attack " + enemy.name;
                                        }
                                    } else {
                                        response.code = 405;
                                        response.message = "The player is neither horitontaly or vertically same to you.";
                                    }
                                } else {
                                    response.code = 405;
                                    response.message = "You cant kill dead players";
                                }
                            } else {
                                response.code = 405;
                                response.message = "No such user.";
                            }
                        } else {
                            response.code = 405;
                            response.message = "Dead People cannot attack.";
                        }
                    } else {
                        response.code = 405;
                        response.message = "Please wait before attacking again.";
                    }
                }
                if (move.toLowerCase() == "give") {

                    var enemy = getUserById(game, id);
                    if (typeof enemy != "undefined") {
                        var userStats = await userCollection.findOne({ "userId": user.id });
                        var enemyStats = await userCollection.findOne({ "userId": enemy.id });
                        if (enemy.health > 0) {

                            if (userStats === null) {
                                userStats = createUserStats(user.id);
                                userCollection.insertOne(userStats, function (err, res) {
                                    if (err) console.log(err);
                                }
                                );
                            }

                            if (enemyStats === null) {
                                enemyStats = createUserStats(enemy.id);
                                userCollection.insertOne(enemyStats, function (err, res) {
                                    if (err) console.log(err);

                                }
                                );
                            }

                            userStats.apGiven++;
                            enemyStats.apRecived++;


                            userCollection.updateOne({ "userId": user.id }, {
                                $set: userStats
                            }, function (err, res) {
                                if (err) console.log(err);
                                console.log("game updated: " + game.channelId);
                            }
                            );
                            userCollection.updateOne({ "userId": enemy.id }, {
                                $set: enemyStats
                            }, function (err, res) {
                                if (err) console.log(err);
                                console.log("game updated: " + game.channelId);
                            }
                            );


                            enemy.actionPoints++;
                            response.message = user.name + " has given his action points to " + enemy.name;

                        } else {
                            response.code = 405;
                            response.message = "You cant give to dead players";
                        }
                    } else {
                        response.code = 405;
                        response.message = "No such user.";
                    }

                }
                if (move.toLowerCase() == "upgrade") {
                    if (user.accuracy < 100) {
                        user.accuracy = user.accuracy + 4;
                        response.message = user.name + ' increased their accuracy from ' + (user.accuracy - 4) + " to " + user.accuracy;
                    } else {
                        response.code = 405;
                        response.message = "Your accuracy is max.";
                    }
                }
                user.actionPoints--;
            } else {
                response.code = 405;
                response.message = "You need more action points!!";
            }

        } else {
            response.code = 405;
            response.message = "You need to wait for more players.";
        }

        if (response.code == 200) {
            response.game = game;
            saveGame(game);
        }
        if (response.code == 100) {
            collection.deleteOne({ "channelId": game.channelId }).then(result => {

                console.log(`${result.deletedCount} document(s) was/were deleted.`)
            });
        }
        return response;
    }

    async function join(channelId, userId, name, channelName, serverName, gameData) {

        var userStats = await userCollection.findOne({ "userId": userId });
        if (userStats === null) {
            userStats = createUserStats(userId);
            userCollection.insertOne(userStats, function (err, res) {
                if (err) console.log(err);
                console.log("game updated: " + game.channelId);
            }
            );
        }
        var response = { code: 200, message: name + " has joined.", game: null };
        return getAllChannels().then(channelIds => {
            if (channelIds.includes(channelId)) {

                if (gameData.id < 8) {
                    if (containsUser(gameData, userId)) {
                        response.code = 405;
                        response.message = "You can join only once.";
                    } else {
                        var x = Math.round(Math.random() * gameData.boardSize);
                        var y = Math.round(Math.random() * gameData.boardSize);
                        gameData.users.push(createUser(userId, name, gameData.id, x, y));
                        gameData.id++;
                        if (gameData.id > 7) {
                            gameData.gameRunning = true;
                        }
                        saveGame(gameData);
                        response.game = gameData;
                    }
                } else {
                    response.code = 405;
                    response.message = "The lobby is full";
                }

            } else {
                var game = createGame(channelId, channelName, serverName);
                var x = Math.round(Math.random() * game.boardSize);
                var y = Math.round(Math.random() * game.boardSize);
                game.users.push(createUser(userId, name, game.id, x, y));
                game.id++;
                collection.insertOne(game, function (err, res) {
                    if (err) console.log(err);
                    console.log("game updated: " + game.channelId);
                }
                );
                if (game.id > 7) {
                    game.gameRunning = true;
                }

                response.game = game;
            }

            return response;
        });
    }
});