const PORT = process.env.PORT || process.env.VCAP_APP_PORT || 3000;
const express = require('express');
const app = express();
const cors = require('cors');
//setup cors
app.use(cors({ origin: '*' }));
const server = require('http').createServer(app);
const io = require('socket.io')(server);
io.set('origins', ['*:*']);


// client page
app.get('/', function (req, res, next) {
    res.sendFile(__dirname + '/client/index.html');
});

// // game sockets

var players = [];

function Player(id) {
    this.id = id;
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.entity = null;
}

io.sockets.on('connection', function (socket) {
    socket.on('initialize', function () {
        var idNum = players.length;
        var newPlayer = new Player(idNum);
        players.push(newPlayer);

        socket.emit('playerData', { id: idNum, players: players });
        socket.broadcast.emit('playerJoined', newPlayer);
    });

    socket.on('positionUpdate', function (data) {
        players[data.id].x = data.x;
        players[data.id].y = data.y;
        players[data.id].z = data.z;

        socket.broadcast.emit('playerMoved', data);
    });

    socket.on('disconnect', function () {
        socket.broadcast.emit('killPlayer', data);
     })
});


console.log('Server started.');
server.listen(PORT);