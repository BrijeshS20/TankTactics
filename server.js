
const { createCanvas } = require('canvas');

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
            "lastMessageId": null,
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
            "lastMessageId": null,
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
            "lastMessageId": null,
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
            "lastMessageId": null,
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
            "lastMessageId": null,
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
            "lastMessageId": null,
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
            "lastMessageId": null,
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
    "lastAction": "",
    "channelId": "892972590447087618",
    "id": 7,
    "gameRunning": true,
    "boardSize": 32,
    "lastMessageId": 894602329695866900
};

games.push(testGameData);
const express = require('express');
const path = require('path');

const app = express();



app.use(express.static(path.resolve(path.join(__dirname, '/public'))));

app.get('/', (req, res) => {

});

app.get('/data', (req, res) => {
    res.send(JSON.stringify(testGameData));
});

app.get('/move', (req, res) => {
    res.send(JSON.stringify(testGameData));
});

app.get('/image', (req, res) => {
    res.send(JSON.stringify(testGameData));
});

app.get('/games', (req, res) => {
    res.send(JSON.stringify(testGameData));
});
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`App listening on port ${PORT}`);
    console.log('Press Ctrl+C to quit.');
});


function getGameById(channelId) {

    games.forEach(function (game) { if (game.channelId == channelId) { return game; } });

}
function getUserById(game, userId) {

    game.users.forEach(function (user) { if (userId == user.id) { return user; } });
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
    return canvas.toBuffer('image/png');

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
    responce.game = game;
    if (responce.code != 405) {
        game.lastAction = responce.message;
        saveGame();
    }
    return responce;
}

function joinOrLeave(channelId, userId) {

}


function saveGame(game) {

}
