'use strict';
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
/*************************/
var channels = {};
var sockets = {};
io.sockets.on('connection', function (socket) {

    // GAME LOGIC
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

    socket.on('disconnect', function (data) {
        if (data) {
            socket.broadcast.emit('killPlayer', data);
        }
     })


    // VIDEO CHAT LOGIC 
    socket.channels = {};
    sockets[socket.id] = socket;

    console.log("[" + socket.id + "] connection accepted");
    socket.on('disconnect', function () {
        for (var channel in socket.channels) {
            part(channel);
        }
        console.log("[" + socket.id + "] disconnected");
        delete sockets[socket.id];
    });


    socket.on('join', function (config) {
        console.log("[" + socket.id + "] join ", config);
        var channel = config.channel;
        var userdata = config.userdata;

        if (channel in socket.channels) {
            console.log("[" + socket.id + "] ERROR: already joined ", channel);
            return;
        }

        if (!(channel in channels)) {
            channels[channel] = {};
        }

        for (id in channels[channel]) {
            channels[channel][id].emit('addPeer', { 'peer_id': socket.id, 'should_create_offer': false });
            socket.emit('addPeer', { 'peer_id': id, 'should_create_offer': true });
        }

        channels[channel][socket.id] = socket;
        socket.channels[channel] = channel;
    });

    function part(channel) {
        console.log("[" + socket.id + "] part ");

        if (!(channel in socket.channels)) {
            console.log("[" + socket.id + "] ERROR: not in ", channel);
            return;
        }

        delete socket.channels[channel];
        delete channels[channel][socket.id];

        for (id in channels[channel]) {
            channels[channel][id].emit('removePeer', { 'peer_id': socket.id });
            socket.emit('removePeer', { 'peer_id': id });
        }
    }
    socket.on('part', part);

    socket.on('relayICECandidate', function (config) {
        var peer_id = config.peer_id;
        var ice_candidate = config.ice_candidate;
        console.log("[" + socket.id + "] relaying ICE candidate to [" + peer_id + "] ", ice_candidate);

        if (peer_id in sockets) {
            sockets[peer_id].emit('iceCandidate', { 'peer_id': socket.id, 'ice_candidate': ice_candidate });
        }
    });

    socket.on('relaySessionDescription', function (config) {
        var peer_id = config.peer_id;
        var session_description = config.session_description;
        console.log("[" + socket.id + "] relaying session description to [" + peer_id + "] ", session_description);

        if (peer_id in sockets) {
            sockets[peer_id].emit('sessionDescription', { 'peer_id': socket.id, 'session_description': session_description });
        }
    });
     
});


console.log('Server started.');
server.listen(PORT);