const express = require('express');
const path = require('path');
const { createCanvas } = require('canvas');

const app = express();
const port = process.env.PORT || '80';

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api', (req, res) => {
    res.render(
        'index',
        {
            title: 'Coming Soon!',
        }
    );
});

app.listen(port, () => {
    console.log(`Listening to requests on http://localhost:${port}`);
});











//DEEPS CODE
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

function saveGame(game) {

}
function getUserById(game, userId) {

    game.users.forEach(function (user) { if (userId == user.id) { return user; } });
}