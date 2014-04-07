var socket = io.connect("http:localhost");
var _canvas  = document.getElementById("mainFrame");
var _context = _canvas.getContext("2d");

var _border = 2;
var _width = _canvas.width - _border *2;
var _height = _canvas.height - _border *2 ;

var REFRESHTIME = 10; // 200ms
var BACKGROUNDCOLOR = '#272822';
var t = Date.now();

// #0 initialization of the player's document
var editor = document.getElementById("editor");
editor.innerHTML = "function mainloop() {\n};\n\nfunction shoot(){\n//#1 get nearest object\n//#2 process vector and return x,y\n};\n\nfunction move(){\n//# repulsive field\n};\n";
function commit(){
    socket.emit("commit",
		JSON.stringify(
		    editor.getSession().getDocument().getAllLines()));
};

// #1 initialization of the canevas
_context.beginPath();
_context.rect(0,
              0,
              _canvas.width,
              _canvas.height);
_context.closePath();
_context.fillStyle = BACKGROUNDCOLOR;
_context.fill();

// #2 game object structure
var gameObjects = []; // current game objects
var gameObjectsOldPosition = []; // old bounding box of objects

// #3 manage event
// #3a receive event of the initialization of a game object
// data._id, data._type, data._bbox, data._speed
socket.on('init', function(data) {
    var realData = JSON.parse(data);
    gameObjects[realData._id] = realData;
    var bbox = {_x:realData._bbox._x,
		_y:realData._bbox._y,
		_w:realData._bbox._w,
		_h:realData._bbox._h};
    gameObjectsOldPosition[keys[i]] = bbox;
});


// #3b receive event of update on direction and position of the object
// data._id, data._x, data._y, data._speed
socket.on('gameobject', function (data) {
    var realData = JSON.parse(data);
    var bbox = {_x:gameObjects[realData._id]._bbox._x,
		_y:gameObjects[realData._id]._bbox._y,
		_w:gameObjects[realData._id]._bbox._w,
		_h:gameObjects[realData._id]._bbox._h};
    gameObjectsOldPosition[realData._id] = bbox;
    gameObjects[realData._id]._bbox._x = realData._x;
    gameObjects[realData._id]._bbox._y = realData._y;
    gameObjects[realData._id]._speed = realData._speed;
});


// #4 update and draw all objects
setInterval(mainLoop, REFRESHTIME);

// #4a main loop
function mainLoop(){
    var now = Date.now();
    var dt = now - t;
    t = now;
    updateAll(dt);
    drawAll();
};

// #4b update the position of all game objects
function updateAll(dt){
    var keys = Object.keys(gameObjects);
    for (var i=0; i<keys.length; ++i){
	// a Save the old values
	var bbox = {_x:gameObjects[keys[i]]._bbox._x,
		    _y:gameObjects[keys[i]]._bbox._y,
		    _w:gameObjects[keys[i]]._bbox._w,
		    _h:gameObjects[keys[i]]._bbox._h};
	gameObjectsOldPosition[keys[i]] = bbox;
	// b Update values
	gameObjects[keys[i]]._bbox._x = gameObjects[keys[i]]._bbox._x
	    + gameObjects[keys[i]]._speed._h * dt; // update x coordinate
	gameObjects[keys[i]]._bbox._y = gameObjects[keys[i]]._bbox._y
	    + gameObjects[keys[i]]._speed._v * dt; // update y coordinate
    };
};

// #4c draw the game objects to their rightful position
function drawAll(){
    var keys = Object.keys(gameObjects);
    for (var i=0; i<keys.length; ++i){
	// a clear the old position
	_context.beginPath();
	_context.rect(gameObjectsOldPosition[keys[i]]._x-5,
		      gameObjectsOldPosition[keys[i]]._y-5,
		      gameObjectsOldPosition[keys[i]]._w+10,
		      gameObjectsOldPosition[keys[i]]._h+10);
	_context.closePath();
	_context.fillStyle = BACKGROUNDCOLOR;
	_context.fill();
	// b draw the object at its new position
	switch (gameObjects[keys[i]]._type){
	case "player":
	    drawPlayer(gameObjects[keys[i]]._bbox,gameObjects[keys[i]]._speed);
	    break;
	case "enemy1":
	    drawEnemy(gameObjects[keys[i]]._bbox, "red");
	    break;
	case "enemy2":
	    drawEnemy(gameObjects[keys[i]]._bbox, "yellow");
	    break;
	case "enemy3":
	    drawEnemy(gameObjects[keys[i]]._bbox, "purple");
	    break;
	case "bullet":
	    drawBullet(gameObjects[keys[i]]._bbox);
	    break;
	};
    };
};

// Draw the box of the enemy
function drawEnemy(bbox, color){
    _context.beginPath();
    _context.rect(bbox._x,
                  bbox._y,
                  bbox._w,
		  bbox._h);
    _context.closePath();
    _context.lineWidth=2;
    _context.strokeStyle = color;
    _context.stroke();
    _context.fillStyle = '#BDBDBD';//lightgrey
    _context.fill();
    _context.beginPath();
    _context.rect(bbox._x+bbox._w/4,
                  bbox._y+bbox._h/4,
                  bbox._w-bbox._w/2,
		  bbox._h-bbox._h/2);
    _context.closePath();
    _context.lineWidth=3;
    _context.strokeStyle = color;
    _context.stroke();
    _context.fillStyle = '#BDBDBD';//lightgrey
    _context.fill();
};

// Draw the triangle of the player
function drawPlayer(bbox, speed){
    var cartesianSpeed = Math.sqrt(Math.pow(speed._v,2)
				   + Math.pow(speed._h,2));
    var relativeSpeed = cartesianSpeed;
    
    var divide = Math.sqrt(Math.pow(speed._h, 2)+ Math.pow(speed._v, 2));
    var angle = Math.acos( speed._v/divide );
    _context.save();
    _context.translate(bbox._x+bbox._w/2, bbox._y+ bbox._h/2);
    _context.rotate(Math.PI + Math.atan2(speed._v,speed._h));
    
    _context.beginPath();
    _context.moveTo(-bbox._w/2,-bbox._h/4);
    _context.lineTo(-bbox._w/8+ 20*relativeSpeed,0);
    _context.lineTo(-bbox._w/2, bbox._h/4);
    _context.closePath();
    _context.fillStyle = 'red';//lightgrey
    _context.fill();
    _context.beginPath();
    _context.moveTo(-bbox._w/2,-bbox._h/4);
    _context.lineTo( bbox._w/2,-bbox._h/2);
    _context.lineTo(-bbox._w/2, bbox._h/4);
    _context.closePath();
    _context.fillStyle = 'blue';//lightgrey
    _context.fill();
    _context.beginPath();
    _context.moveTo(-bbox._w/2,-bbox._h/4);
    _context.lineTo( bbox._w/2, bbox._h/2);
    _context.lineTo(-bbox._w/2, bbox._h/4);
    _context.closePath();
    _context.fillStyle = 'blue';//lightgrey
    _context.fill();

    _context.restore();

};

// Draw the circle of the bullet
function drawBullet(bbox){
    _context.beginPath();
    _context.arc(bbox._x+bbox._w/2,
		 bbox._y+bbox._h/2,
		 bbox._w/2, 0, 2 * Math.PI, false);
    _context.closePath();
    _context.lineWidth = 2;
    _context.strokeStyle = 'orange';
    _context.stroke();
    _context.fillStyle = 'lightgrey';//lightgrey
    _context.fill();
};

var enemy = {_id:0,
	     _bbox:{_x:50, _y:50, _w:15, _h:15 },
	     _speed:{_v:0,_h:0},
	     _type:"player"};

// gameObjects[0]=enemy;
// gameObjectsOldPosition[0]=enemy._bbox;


// setTimeout(function(){gameObjects[0]._speed = {_v:0.1,_h:0.1}; }, 5000);
// setTimeout(function(){gameObjects[0]._speed = {_v:-0.1,_h:-0.1}; }, 10000);
