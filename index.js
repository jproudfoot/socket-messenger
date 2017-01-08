var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var mongoose = require('mongoose');
mongoose.Promise = require('bluebird');

//Directory management for static content
app.use(express.static(__dirname + '/public'));

//Schema for Mongoose and MongoDB
var messageSchema = mongoose.Schema({
	username: String,
	message: String,
	timestamp: String
});
var Message = mongoose.model('Message', messageSchema);

app.get('/', function(req, res) {
	res.sendFile('/public/index.html');
});

io.on('connection', function(socket) {
	console.log('a user connected');
	mongoose.connect('mongodb://localhost/messenger');
	var db = mongoose.connection;
	db.on('error', console.error.bind(console, 'connection error:'));
	Message.find().sort('-timestamp').limit(10).exec(function(err, messages) {
		socket.emit('past messages', messages);
	});
	db.close();
	
	//Message Recieved From Client
	socket.on('chat message', function(msg){
		
		mongoose.connect('mongodb://localhost/messenger');
		var db = mongoose.connection;
		db.on('error', console.error.bind(console, 'connection error:'));
		db.once('open', function() {	
			var message = new Message({ username: socket.username, message: msg, timestamp: +new Date() });
			
			message.save(function (err, message) {
				if (err) return console.error(err);
				console.log('message saved: ' + msg);
				db.close();
			});
			
			socket.broadcast.emit('chat message', {username: socket.username, message: msg});
		});
	});
	
	//New Username from Client
	socket.on('new username', function(username) {
		socket.username = username;
		console.log(username + ' has joined the chat');
	});
	
	//Client Disconnected
	socket.on('disconnect', function() {
		console.log('user disconnected');
	});
});

http.listen(3000, function() {
	console.log('listening on *:3000');
});