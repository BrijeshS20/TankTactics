const { createCanvas } = require('canvas');
const cfg = require('./cfg.json');
const { MongoClient } = require('mongodb');
const DiscordOauth2 = require("discord-oauth2");
const express = require('express');
const path = require('path');
const { NOTINITIALIZED } = require('dns');
const { report } = require('process');
const { response } = require('express');
const { Worker } = require('worker_threads')

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
    const fastPaceCollection = client.db("Game").collection("fast");
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
        oauth.getUser(req.query.code).then((resp) => {

            setAccessToken(req.query.code, resp.id);
            res.redirect('/?userId=' + resp.id + '&key=' + req.query.code);

        });
    });

    app.get('/stats', (req, res) => {
        userCollection.findOne({ "userId": req.query.userId }).then(user => {
            res.send(user);
        });
    });

    async function getLeaderBoard() {
        var leaderBoard = await userCollection.find({}).sort({ "wins": -1 }).limit(10);
        return leaderBoard.toArray();
    }
    app.get('/leaderboard', (req, res) => {
        getLeaderBoard().then(leaderBoard => { res.send(leaderBoard); });

    });

    app.get('/data', (req, res) => {

        getGameById(req.query.channelId).then(game => { res.setHeader("Access-Control-Allow-Origin", "*").send(game); });
    });

    app.get('/join', (req, res) => {
        var login = getAccessToken(req.query.userId);
        if (req.query.key == cfg.bot || login != null) {
            if (req.query.key == cfg.bot || login.token == req.query.key) {
                getGameById(req.query.channelId).then(game => {
                    console.log("joining user");

                    join(req.query.channelId, req.query.userId, req.query.name, req.query.channelName, req.query.serverName, game).then(action => {
                        res.send(action);
                    });
                });
            } else {
                res.send({ "code": 405, "message": "Session Timed Out. Please reload page" });
            }
        } else {
            res.send({ "code": 405, "message": "Session Timed Out. Please reload page" });
        }
    });

    app.get('/bot', (req, res) => {

        if (req.query.key == cfg.bot) {
            var actions = previousAction;
            previousAction = [];
            res.send(actions);
        }
    });


    app.get('/move', (req, res) => {
        var login = getAccessToken(req.query.userId);
        if (req.query.key == cfg.bot || login != null) {
            if (req.query.key == cfg.bot || login.token == req.query.key) {
                getGameById(req.query.channelId).then(game => {
                    UpdateGameMovement(game, req.query.userId, req.query.move, req.query.id).then(action => {
                        if (typeof req.query.bot == 'undefined' || req.query.move == 'attack') {
                            var actionSave = { "code": action.code, "message": action.message, "channelId": req.query.channelId };
                            if (actionSave.code != 405) {
                                previousAction.push(actionSave);
                            }

                        }
                        res.setHeader("Access-Control-Allow-Origin", "*").send(action);
                    });
                });
            } else {
                res.send({ "code": 405, "message": "Session Timed Out. Please reload page" });
            }
        } else {
            res.send({ "code": 405, "message": "Session Timed Out. Please reload page" });
        }
    });

    app.get('/image', (req, res) => {
        res.setHeader('Content-Type', 'image/png');
        getGameById(req.query.channelId).then(game => {
            DrawNodeJS(game).pngStream().pipe(res);
        });
    });
    app.get('/game.html', (req, res) => {
        res.redirect('/#help');
    });
    app.get('/leave', (req, res) => {
        if (req.query.key == cfg.bot) {

            console.log("leaving user");

            leave(req.query.userId, req.query.channelId).then(action => {
                res.send(action);
            });

        }
    });

    app.get('/start', (req, res) => {
        var login = getAccessToken(req.query.userId);
        if (req.query.key == cfg.bot || login != null) {
            if (req.query.key == cfg.bot || login.token == req.query.key) {
                start(req.query.channelId, req.query.userId).then(action => {
                    res.send(action);
                });
            }
        }
    });

    app.get('/fast', (req, res) => {
        var login = getAccessToken(req.query.userId);
        if (req.query.key == cfg.bot || login != null) {
            if (req.query.key == cfg.bot || login.token == req.query.key) {
                fastMode(req.query.channelId, req.query.userId).then(action => {
                    res.send(action);
                });
            }
        }
    });
app.get('/games', (req, res) => {
    var login = getAccessToken(req.query.userId);
    if (req.query.key == cfg.bot || login != null) {
        if (req.query.key == cfg.bot || login.token == req.query.key) {
            getGames(req.query.userId).then(lobbies => {
                res.setHeader("Access-Control-Allow-Origin", "*").send(lobbies);
            });
        } else {
            res.send({ "code": 405, "message": "Session Timed Out. Please reload page" });
        }
    } else {
        res.send({ "code": 405, "message": "Session Timed Out. Please reload page" });
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log("Starting server!!!");
    calculateActionPointsForFastMode();
});

async function getAccessToken(userId) {
    var loginCred = await userCollection.find({ "userId": userId });
    return loginCred;
}
async function setAccessToken(token, userId) {
    userCollection.insertOne({ "userId": userId + " creds", "token": token });
}
async function calculateActionPoints() {
    console.log("Calculating action points");
    collection.find({}).toArray(function (err, games) {
        games.forEach((game) => {
            if (game.gameRunning) {
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
                if (game.fastPaced == null) {
                    game.fastPaced = false;
                }
                game.users.forEach(user => {

                    user.hour++;
                    if (user.health == 0) {
                        user.hour = user.hour + 3;
                    }
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

}
var minutes = 0;
async function calculateActionPointsForFastMode() {
    minutes++;
    fastPaceCollection.find({}).toArray(function (err, games) {
        games.forEach((game) => {
            if (game.gameRunning) {
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
                game.users.forEach(user => {

                    user.hour++;
                    if (user.health == 0) {
                        user.hour = user.hour + 3;
                    }
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
    if (minutes == 60) {
        minutes = 0;
        calculateActionPoints();
    }
    setTimeout(calculateActionPointsForFastMode, 1000 * 60);
}

//channels
async function getAllChannels() {
    var channelids = [];
    var cursor = collection.find({});
    while (await cursor.hasNext()) {
        const doc = await cursor.next();
        channelids.push(doc.channelId);
    }

     cursor = fastPaceCollection.find({});
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
        "users": [], "channelId": channelId, "id": 0, "fastPaced": false, "gameRunning": false, "channelName": channelName, "serverName": serverName, "boardSize": 32
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
    if (!game.fastPaced) {
        collection.updateOne({
            "channelId": game.channelId
        }, {
            $set: game
        }, function (err, res) {
            if (err) console.log(err);
            console.log("game updated: " + game.channelId);
        }
        );
    } else {
        fastPaceCollection.updateOne({
            "channelId": game.channelId
        }, {
            $set: game
        }, function (err, res) {
            if (err) console.log(err);
            console.log("game updated: " + game.channelId);
        }
        );
    }
}

async function getGameById(channelId) {
    var game = await collection.findOne({ "channelId": channelId });
    if (game == null) {
        game = await fastPaceCollection.findOne({ "channelId": channelId });
        if (game == null) {
            game = createGame(channelId, "", "");
        }
    }
    return game;
}

function createUserStats(userId) {
    return {
        "userId": userId,
        "wins": 0,
        "kills": 0,
        "deaths": 0,
        "apGiven": 0,
        "apRecived": 0
    }
}

//API main function
async function getGames(userId) {
    var lobbies = [];
    var cursor = collection.find({});
    while (await cursor.hasNext()) {
        const game = await cursor.next();
        if (containsUser(game, userId)) {
            lobbies.push({ "channelId": game.channelId, "channelName": game.channelName, "serverName": game.serverName });
        }
    }
    cursor = fastPaceCollection.find({});
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

async function start(channelId, userId) {
    var game = await getGameById(channelId);
    var response = { code: 200, message: "The game has started!\nNote: Stats are only counted for games with over 6 players.", game: null };
    if (game.users.length > 3) {
        if (game.users[0].id == userId) {
            game.gameRunning = true;
            saveGame(game);
        } else {
            response.code = 405;
            response.message = `You aren't the host of this lobby! Ask ${game.users[0].name} to start.\nNote: Stats are only counted for games with over 6 players.`
        }
    } else {
        response.code = 405;
        response.message = "You need atleast 4 players!\nNote: Stats are only counted for games with over 6 players."

    }

    var actionSave = { "code": response.code, "message": response.message, "channelId": channelId };
    if (actionSave.code != 405) {
        previousAction.push(actionSave);
    }
    return response;

}

async function fastMode(channelId, userId) {
    var game = await getGameById(channelId);
    var response = { code: 200, message: "The blitz gamemode has been enabled!", game: null };

    if (game.users[0].id == userId) {
        collection.deleteOne({ "channelId": game.channelId }).then(result => {

            console.log(`${result.deletedCount} document(s) was/were deleted.`)
        });

        game.fastPaced = true;
        fastPaceCollection.insertOne(game, function (err, res) {
            if (err) console.log(err);
            console.log("game updated: " + game.channelId);
        });
        saveGame(game);
    } else {
        response.code = 405;
        response.message = `You aren't the host of this lobby! Only ${game.users[0].name} can switch gamemodes.`
    }
    var actionSave = { "code": response.code, "message": response.message, "channelId": channelId };
    if (actionSave.code != 405) {
        previousAction.push(actionSave);
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
    var response = { code: 200, message: name + " has joined!", game: null };
    return getAllChannels().then(channelIds => {
        if (channelIds.includes(channelId)) {

            if (!gameData.gameRunning) {
                if (containsUser(gameData, userId)) {
                    response.code = 405;
                    response.message = "You've already joined this lobby!";
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
                response.message = "This lobby is already full!";
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
async function leave(userId, channelId) {

    var game = await getGameById(channelId);
    var user = getUserById(game, userId);
    var response = { code: 200, message: user.name + " has left!" };
    if (user != null) {
        game.users.splice(user.playerId, 1);
        var users = game.users;
        var newUsers = [];
        game.id = 0;
        users.forEach(user1 => {
            var newUser = createUser(user1.id, user1.name, game.id, user1.x, user1.y);
            game.id++;
            newUser.health = user1.health;
            newUser.actionPoints = user1.actionPoints;
            newUsers.push(newUser);
        });

        game.users = newUsers;
        saveGame(game);

    } else {
        response.code = 405;
        response.message = 'You aren\'t in this lobby!';
    }

    return response;
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
                        response.message = "You've reached the world border, preventing you from moving any further!";
                    }
                } else {
                    response.code = 405;
                    response.message = "You're already dead, preventing you from moving any further!";
                }
            }
            if (move.toLowerCase() == "down") {
                if (user.health > 0) {
                    if (user.y < game.boardSize - 1) {
                        user.y++;
                        response.message = user.name + " has moved!";
                    } else {
                        response.code = 405;
                        response.message = "You've reached the world border, preventing you from moving any further!";
                    }
                } else {
                    response.code = 405;
                    response.message = "You're already dead, preventing you from moving any further!";
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
                        response.message = "You've reached the world border, preventing you from moving any further!";
                    }
                } else {
                    response.code = 405;
                    response.message = "You're already dead, preventing you from moving any further!";
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
                        response.message = "You've reached the world border, preventing you from moving any further!";
                    }
                } else {
                    response.code = 405;
                    response.message = "You're already dead, preventing you from moving any further!";
                }
            }
            if (move.toLowerCase() == "attack") {
                var user = getUserById(game, userId);
                if (Date.now() > user.lastAttack + 1000 * 60 * 5) {
                    var enemy = getUserById(game, id);
                    if (user.health > 0) {
                        if (typeof enemy != "undefined") {

                            if (enemy.health > 0) {
                                if (enemy.x == user.x || enemy.y == user.y) {
                                    if (Math.random() * 100 < user.accuracy) {
                                        enemy.health--;
                                        if (!game.fastPaced) {
                                            user.lastAttack = Date.now();
                                        }
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
                                                response.message = `${user.name} successfully killed ${enemy.name}, and won the game!`;
                                            }
                                            if (game.users.length > 5) {
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
                                            }
                                        } else {

                                            response.message = `${user.name} successfully attacked ${enemy.name}!`;
                                        }
                                    } else {
                                        response.code = 200;
                                        response.message = `${user.name} tried attacking ${enemy.name}, but failed.`;
                                    }
                                } else {
                                    response.code = 405;
                                    response.message = `${enemy.name} isn't in your attack range! You must be perpendicular to them before attacking.`;
                                }
                            } else {
                                response.code = 405;
                                response.message = "You can't attack a user whose already dead!";
                            }
                        } else {
                            response.code = 405;
                            response.message = "The user was not found!";
                        }
                    } else {
                        response.code = 405;
                        response.message = `You're already dead, preventing you from attacking ${enemy.name}!`;
                    }
                } else {
                    response.code = 405;
                    response.message = "You are on cooldown! Please wait before attacking again.";
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

                        if (game.users.length > 5) {
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
                        }

                        enemy.actionPoints++;
                        response.message = `${user.name} has given their AP to ${enemy.name}`;

                    } else {
                        response.code = 405;
                        response.message = `You can't give your AP to ${enemy.name}, since they're dead!`;
                    }
                } else {
                    response.code = 405;
                    response.message = "The user was not found!";
                }

            }
            if (move.toLowerCase() == "upgrade") {
                if (user.accuracy < 100) {
                    user.accuracy = user.accuracy + 4;
                    response.message = `${user.name} upgraded their tank, increasing their accuracy from ${user.accurcacy - 4} to ${user.acuraccy}!`
                } else {
                    response.code = 405;
                    response.message = "You've already maxed out your tank!";
                }
            }


            if (move.toLowerCase() == "heal") {
                var user = getUserById(game, userId);
                if (user.health > 0) {
                    if (user.health != 3) {
                        if (Math.random() * 100 < 15) {
                            user.health++;
                            response.code = 200;
                            response.message = `${user.name} successfully healed themselves!`;
                        } else {
                            response.code = 200;
                            response.message = `${user.name} tried healing themseleves, but failed!`;
                        }
                    } else {
                        response.code = 405;
                        response.message = "You cannot heal yourself when you're already at full HP!";
                    }
                } else {
                    response.code = 405;
                    response.message = "You're already dead, preventing you from healing yourself!";
                }
            }

            if (move.toLowerCase() == "revive") {
                var user = getUserById(game, userId);
                if (user.health > 0) {
                    var enemy = getUserById(game, id);
                    if (typeof enemy != "undefined") {
                        if (enemy.health > 0) {
                            response.code = 405;
                            response.message = "You cannot revive players who haven't died yet!";
                        } else {
                            if (Math.random() * 100 < 5) {
                                enemy.health = 2;
                                response.code = 200;
                                response.message = user.name + " successfully revived " + enemy.name;
                            } else {
                                response.code = 200;
                                response.message = user.name + " tried reviving " + enemy.name + ", but failed!";
                            }
                        }
                    } else {
                        response.code = 405;
                        response.message = "The user was not found!";
                    }
                } else {
                    response.code = 405;
                    response.message = "You're already dead, preventing you from reviving other dead players!";
                }
            }

            if (move.toLowerCase() == "steal") {
                var user = getUserById(game, userId);
                if (Date.now() > user.lastAttack + 1000 * 60 * 5) {
                    var enemy = getUserById(game, id);
                    if (user.health > 0) {
                        if (typeof enemy != "undefined") {
                            if (enemy.health > 0) {

                                if (enemy.actionPoints > 15) {

                                    if (Math.random() * 4 < 1) {
                                        response.code = 200;
                                        var apStole = Math.round(Math.random() * user.actionPoints);
                                        enemy.actionPoints = enemy.actionPoints - apStole;
                                        user.actionPoints = user.actionPoints + apStole;
                                        response.message = user.name + " stole " + apStole + " AP from " + enemy.name + "!";
                                    } else {
                                        response.code = 200;
                                        response.message = `${user.name} tried stealing AP from ${enemy.name}, but failed! They ended up giving them 1 AP.`
                                    }
                                } else {
                                    response.code = 405;
                                    response.message = `Users such as ${enemy.name}, who don't have more than 15 AP cannot be stolen from.`;
                                }
                            } else {
                                response.code = 405;
                                response.message = "You can't steal from dead players!";
                            }
                        } else {
                            response.code = 405;
                            response.message = "The user was not found!";
                        }
                    } else {
                        response.code = 405;
                        response.message = "You're already dead, preventing you from stealing AP from other players!";
                    }
                } else {
                    response.code = 405;
                    response.message = "You are on cooldown! Please wait before stealing again.";
                }
            }


        } else {
            response.code = 405;
            response.message = "You need more action points!";
        }

    } else {
        response.code = 405;
        response.message = "You need to wait for more players!";
    }


    if (move.toLowerCase() == "resort") {
        var user = getUserById(game, userId);
        var enemy = getUserById(game, id);
        if (user.health > 0) {
            if (typeof enemy != "undefined") {

                if (user.resorted == null) {
                    if (enemy.health > 0) {
                        enemy.health = enemy.health - 2;
                        if (enemy.health < 0) {
                            enemy.health = 0;
                        }
                        user.resorted = true;
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

                            response.message = user.name + " has successfully killed " + enemy.name;
                            if (alivePeople == 1) {
                                userStats.wins++;
                                response.code = 100;
                                response.message = user.name + " has successfully killed " + enemy.name + ", and won the game!";
                            }
                            if (game.users.length > 5) {
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
                            }
                        } else {

                            response.message = user.name + " has attacked " + enemy.name;
                        }
                    } else {
                        response.code = 405;
                        response.message = `${enemy.name} is already dead!`;
                    }
                } else {
                    response.code = 405;
                    response.message = "The `resort` command can't be used more than once per lobby!";
                }
            } else {
                response.code = 405;
                response.message = "The user was not found!";
            }
        } else {
            response.code = 405;
            response.message = "You're already dead, preventing you from attacking other players!";
        }
    }

    if (response.code == 200) {
        user.actionPoints--;
        if ((Math.random() * 8) < 1) {
            user.hour = 0;
            user.actionPoints++;
            previousAction.push({ "code": 200, "message": user.name + " has received an AP!", "channelId": game.channelId });
            response.message += `\n${user.name} has received an AP for doing an action.`;
        };
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
});
