var evil = require("http").createServer(httpHandler);
var url = require('url');
var io   = require("socket.io").listen(evil);
var fs   = require("fs");

evil.listen(1337);

function httpHandler(req, res) {
    var page = url.parse(req.url).pathname;
    if (page=="/"){
	fs.readFile("../client/main.html", function (err, data) {
	    if (err){
		res.writeHead(500);
		return res.end("No main found");
	    };
	    res.writeHead(200);
	    res.end(data);
	});
    };
    if (page=="/event.js"){
        fs.readFile("../client/event.js", function (err, data) {
            if (err){
                res.writeHead(500);
                return res.end("No event found");
            };
            res.writeHead(200);
            res.end(data);
        });
    };
};

io.sockets.on('connection', function (socket){
    // #1 example of game object created by the server
    var player = {_id:0,
		  _bbox:{_x:50, _y:50, _w:20, _h:20 },
		  _speed:{_v:0.,_h:0.},
		  _type:"player"};
    socket.emit("init", JSON.stringify(player));

    var enemy1 = {_id:1,
		  _bbox:{_x:200, _y:200, _w:20, _h:20 },
		  _speed:{_v:0.,_h:0.},
		  _type:"enemy1"};
    socket.emit("init", JSON.stringify(enemy1));

    var enemy2 = {_id:2,
		  _bbox:{_x:300, _y:200, _w:20, _h:20 },
		  _speed:{_v:0.01,_h:0.02},
		  _type:"enemy2"};
    socket.emit("init", JSON.stringify(enemy2));

    var enemy3 = {_id:3,
		  _bbox:{_x:200, _y:300, _w:20, _h:20 },
		  _speed:{_v:-0.024,_h:0.12},
		  _type:"enemy3"};
    socket.emit("init", JSON.stringify(enemy3));
    

    var updates = [];
    for (var i = 0; i<10; ++i){
	setTimeout(function(){
	    var update = {_id:0, _x:50, _y:50, _speed:{_v:Math.random()/2,
						       _h:Math.random()/2}};
	    socket.emit("gameobject", JSON.stringify(update));
	}, (i+1)*2000);
    };


    // #2 the code of the player is executed
    socket.on("commit", function(data){
	var lines = JSON.parse(data);
	var linearized = lines.join(" ");
	eval(linearized);
    });
});



