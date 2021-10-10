
const { createCanvas } = require('canvas');

const { Datastore } = require('@google-cloud/datastore');


var games = [];



var testGameData = {
    "users": [
        {
            "id": "794921502230577182",
            "color": {
                "color": "#ffffff",
                "emote": ":white_circle:"
            },
            "name": "deepparag",
            "x": 21,
            "y": 18,
            "actionPoints": 3,
            "hour": 3,
            "health": 3,
            "lastAttack": 0,
            "accuracy": 80,
            "playerId": 0
        },
        {
            "id": "875042500056862721",
            "color": {
                "color": "#0015ff",
                "emote": ":blue_circle:"
            },
            "name": "Definitely not a Muse",
            "x": 7,
            "y": 30,
            "actionPoints": 6,
            "hour": 3,
            "health": 3,
            "lastAttack": 0,
            "accuracy": 80,
            "playerId": 1
        },
        {
            "id": "792002811583266856",
            "color": {
                "color": "#701420",
                "emote": ":brown_circle:"
            },
            "name": "DaWise_Weirdo",
            "x": 17,
            "y": 22,
            "actionPoints": 3,
            "hour": 2,
            "health": 3,
            "lastAttack": 0,
            "accuracy": 80,
            "playerId": 2
        },
        {
            "id": "819805772522324008",
            "color": {
                "color": "#00a80e",
                "emote": ":green_circle:"
            },
            "name": "Yelena",
            "x": 21,
            "y": 23,
            "actionPoints": 5,
            "hour": 6,
            "health": 3,
            "lastAttack": 0,
            "accuracy": 80,
            "playerId": 3
        },
        {
            "id": "762366471371751455",
            "color": {
                "color": "#ff6f00",
                "emote": ":orange_circle:"
            },
            "name": "notalivehuman",
            "x": 28,
            "y": 23,
            "actionPoints": 4,
            "hour": 0,
            "health": 3,
            "lastAttack": 0,
            "accuracy": 80,
            "playerId": 4
        },
        {
            "id": "840322628807163984",
            "color": {
                "color": "#3f00a3",
                "emote": ":purple_circle:"
            },
            "name": "????",
            "x": 10,
            "y": 23,
            "actionPoints": 5,
            "hour": 1,
            "health": 3,
            "lastAttack": 0,
            "accuracy": 80,
            "playerId": 5
        },
        {
            "id": "766162972014805023",
            "color": {
                "color": "#ff2f00",
                "emote": ":red_circle:"
            },
            "name": "natasha",
            "x": 7,
            "y": 14,
            "actionPoints": 7,
            "hour": 2,
            "health": 3,
            "lastAttack": 0,
            "accuracy": 80,
            "playerId": 6
        }

    ],
    "channelId": "892972590447087618",
    "id": 7,
    "gameRunning": true,
    "boardSize": 32
};



// Instantiate a datastore client
const datastore = new Datastore();
const express = require('express');
const path = require('path');
const app = express();

datastore.get(datastore.key(["Game","save"]), function (err, entity) {
    if (typeof entity !== 'undefined') {
        var channelIds = entity.channelId;
        channelIds.forEach((channelId) => {
            datastore.get(datastore.key(["Game", channelId]), function (err, entity) {
                if (typeof entity !== 'undefined') {
                    games.push(entity);
                }
            });
        });
    }
});

app.use(express.static(path.resolve(path.join(__dirname, '/public'))));

games.push(testGameData);
app.get('/', (req, res) => {

});

app.get('/data', (req, res) => {
    res.send(getGameById(req.query.channelId));

});

app.get('/join', (req, res) => {
    console.log(req.query);
    res.send(join(req.query.channelId, req.query.userId, req.query.name));

});

app.get('/move', (req, res) => {
    res.send(UpdateGameMovement(getGameById(req.query.channelId), req.query.userId, req.query.move,req.query.id));
});

app.get('/image', (req, res) => {
    res.send(DrawNodeJS(getGameById(req.query.channelId)));
});

app.get('/games', (req, res) => {
    res.send(getGames(res.query.userId));
});
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`App listening on port ${PORT}`);
    console.log('Press Ctrl+C to quit.');
});

function getGames(userId) {
    var lobbies = [];
    games.forEach(function (game) { if (containsUser(game, userId)) { lobbies.push(game.channelId); } });
    return lobbies;

}
function getGameById(channelId) {
    var gameToReturn;
    games.forEach(function (game) {
        console.log(game.channelId + " " + channelId + " " + (game.channelId == channelId));
        if (game.channelId == channelId) {
            gameToReturn= game;
        }
    });
    return gameToReturn;
}
function getUserById(game, userId) {
    var userToReturn;
    game.users.forEach(function (user) { if (userId == user.id) { userToReturn = user; } });
    return userToReturn;
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
        context.fillStyle = user.color.color;
        context.fillRect(user.x * 20 - 1.5, user.y * 20 - 1.5, 13, 13);
    });
    return canvas.toBuffer();

}


function UpdateGameMovement(game, userId, move, id) {
    userId = Number(userId);
    id = Number(id);
    var user = getUserById(game, userId);
    var responce = { code: 200, message: "", game: null };
    if (game.gameRunning) {
        if (user.actionPoints > 0) {
            if (move.toLowerCase() == "up") {

                if (user.y > 0) {
                    user.y--;
                    responce.message = user.name + " has moved";
                } else {
                    responce.code = 405;
                    responce.message = "Reached edge of Map";
                }

            }
            if (move.toLowerCase() == "down") {
                if (user.y < game.boardSize - 1) {
                    user.y++;
                    responce.message = user.name + " has moved";
                } else {
                    responce.code = 405;
                    responce.message = "Reached edge of Map";
                }
            }
            if (move.toLowerCase() == "right") {
                var user = getUserById(game, userId);
                if (user.x < game.boardSize - 1) {
                    user.x++;
                    responce.message = user.name + " has moved";
                } else {
                    responce.code = 405;
                    responce.message = "Reached edge of Map";
                }
            }
            if (move.toLowerCase() == "left") {
                var user = getUserById(game, userId);
                if (user.x > 0) {
                    user.x--;
                    responce.message = user.name + " has moved";
                } else {
                    responce.code = 405;
                    responce.message = "Reached edge of Map";
                }
            }
            if (move.toLowerCase() == "attack") {
                var user = getUserById(game, userId);
                if (Date.now > user.lastAttack + 1000 * 60 * 15) {
                    var enemy = getUserById(game, id);
                    if (typeof enemy != "undefined") {

                        if (enemy.health > 0) {
                            if (enemy.x == user.x || enemy.y == user.y) {
                                if (Math.random() * 100 < user.accuracy) {
                                    enemy.health--;
                                    if (enemy.health == 0) {
                                        responce.message = user.name + " has killed" + enemy.name;
                                        var lastPersonAlive = true;
                                        game.users.forEach(function (user) {
                                            if (user.health > 0) {
                                                lastPersonAlive = false;
                                            }
                                        });
                                        if (!lastPersonAlive) {
                                            responce.code = 100;
                                            responce.message = user.name + " has Won the game by killing " + enemy.name;
                                        }
                                    } else {
                                        responce.message = user.name + " has attacked " + enemy.name;
                                    }
                                } else {
                                    responce.message = user.name + " has tried to attack " + enemy.name;
                                }
                            } else {
                                responce.code = 405;
                                responce.message = "The player is neither horitontaly or vertically same to u.";
                            }
                        } else {
                            responce.code = 405;
                            responce.message = "You cant kill dead players";
                        }
                    } else {
                        responce.code = 405;
                        responce.message = "No such user.";
                    }
                } else {
                    responce.code = 405;
                    responce.message = "Please wait before attacking again.";
                }
            }
            if (move.toLowerCase() == "give") {

                var enemy = getUserById(game, id);
                if (typeof enemy != "undefined") {

                    if (enemy.health > 0) {
                        enemy.actionPoints++;
                        responce.message = user.name + " has given his action points to " + enemy.name;
                    } else {
                        responce.code = 405;
                        responce.message = "You cant give to dead players";
                    }
                } else {
                    responce.code = 405;
                    responce.message = "No such user.";
                }

            }
            if (move.toLowerCase() == "upgrade") {
                if (user.accuracy < 100) {
                    user.accuracy = user.accuracy + 4;
                    responce.message = user.name = " increased their accuracy from " + (user.accuracy - 4) + " to " + user.accuracy;
                } else {
                    responce.code = 405;
                    responce.message = "Your accuracy is max.";
                }
            }
            user.actionPoints--;
        } else {
            responce.code = 405;
            responce.message = "You need more action points!!";
        }

    } else {
        responce.code = 405;
        responce.message = "You need to wait for more players.";
    }

    if (responce.code == 200) {
        responce.game = game;
        saveGame(game);
    }
    if (responce.code == 100) {
        datastore.delete(datastore.key(["Game", game.channelId])).then((responce) => { console.log(responce); });
    }
    return responce;
}

function join(channelId, userId, name) {
    var responce = { code: 200, message: name+" has joined." , game: null };
    var channelIds = getAllChannels();
    console.log(channelIds);
    if (channelIds.includes(channelId)) {
        var game = getGameById(channelId);
        if (containsUser(game, userId)) {
            responce.code = 405;
            responce.message = "U can join only once.";
        } else {
            var x = Math.round(Math.random() * game.boardSize);
            var y = Math.round(Math.random() * game.boardSize);
            game.users.push(createUser(userId, name, game.id, x, y));
            game.id++;
            if (game.id > 7) {
                game.gameRunning = true;
            }
            saveGame(game);
            responce.game = game;
        }
    
    } else {
        var game = createGame(channelId);
        var x = Math.round(Math.random() * game.boardSize);
        var y = Math.round(Math.random() * game.boardSize);
        game.users.push(createUser(userId, name, game.id, x, y));
        games.push(game);
        game.id++;
        saveGame(game);
        if (game.id > 7) {
            game.gameRunning = true;
        }

        responce.game = game;
    }
    return responce;
}

function containsUser(game, userId) {
    var userThere = false;
    game.users.forEach((user) => {
        if (user.id == userId) {
            userThere= true;
        }
    });
    return userThere;
}
function createGame(channelId) {
    return {
        "users": [], "channelId": channelId, "id": 0, "gameRunning": false, "boardSize": 32
    }
}

function createUser(id, name, playerId, x, y) {
    var user = {
        "id": id,
        "color": {
            "emote": "",
            "color":""
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
    console.log(playerId);
    if (playerId == 0) {
        user.color.emote = ":blue_circle:";
        user.color.color = "#00eeff";
    } else if (playerId == 1) {
        user.color.emote = ":brown_circle:";
        user.color.color = "#4a2d2d";
    } else if (playerId == 2) {
        user.color.emote = ":green_circle:";
        user.color.color = "#22ff00";
    } else if (playerId == 3) {
        user.color.emote = ":orange_circle:";
        user.color.color = "#b300ff";
    } else if (playerId == 4) {
        user.color.emote = ":purple_circle:";
        user.color.color = "#b300ff";
    } else if (playerId == 5) {
        user.color.emote = ":red_circle:";
        user.color.color = "#ff0000";
    } else if (playerId == 6) {
        user.color.emote = ":yellow_circle:";
        user.color.color = "#ffea00";
    } else if (playerId == 7) {
        user.color.emote = ":white_circle:";
        user.color.color = "#ffffff";
    }

    return user;
}



function saveGame(game) {
    console.log(game);
    var channelIds = getAllChannels();
    datastore.save({ key: datastore.key(["Game", "save"]), data: { "channelId": channelIds } });
    datastore.save({ key: datastore.key(["Game", game.channelId]), data: game });
}
function getAllChannels() {
    var channelids = [];
    games.forEach((game) => { channelids.push(game.channelId) });
    return channelids;
}

