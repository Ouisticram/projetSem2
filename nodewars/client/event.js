var socket = io.connect("http:localhost");

var _canvas  = document.getElementById("mainFrame");
var _context = _canvas.getContext("2d");
var _border = 2;
var _width = _canvas.width - _border *2;
var _height = _canvas.height - _border *2 ;

var _canvas2 = document.getElementById("secondFrame");
var _context2 = _canvas2.getContext("2d");


var REFRESHTIME = 30; // 30ms
var BACKGROUNDCOLOR = '#272822';
var t = Date.now();
var fin = false;
var temps = 0;
var score = 0;
var tempsRestant = 0;
var vague2 = 1;
var nbDeadEnemies = 0;

// #0 initialization of the player's document
var editor = document.getElementById("editor");
editor.innerHTML = "function move_player(){\n\tvar dir = [];\n\tif((gameObjects[0]._bbox._x<100)&&(gameObjects[0]._bbox._y<380)){\n\t\tdir[0] = 50;\n\t\tdir[1] = 390;\n\t} else{\n\t\tif((gameObjects[0]._bbox._x<540)&&(gameObjects[0]._bbox._y>=380)){\n\t\t\tdir[0] = 550;\n\t\t\tdir[1] = 390;\n\t\t} else{\n\t\t\tif((gameObjects[0]._bbox._x>=540)&&(gameObjects[0]._bbox._y>=100)){\n\t\t\t\tdir[0] = 550;\n\t\t\t\tdir[1] = 50;\n\t\t\t} else{\n\t\t\t\tif((gameObjects[0]._bbox._x>=100)&&(gameObjects[0]._bbox._y<100)){\n\t\t\t\t\tdir[0] = 50;\n\t\t\t\t\tdir[1] = 50;\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n\tmove(dir[0],dir[1]);\n}\nmove_player();\nif(getNearest(1)._x != -1 && getNearest(1)._y != -1) shoot(getNearest(1)._x, getNearest(1)._y);";
function commit(){
    socket.emit("commit",
		JSON.stringify(
		    editor.getSession().getDocument().getAllLines()));
};

// #1A initialization of the canevas
_context.beginPath();
_context.rect(0,
              0,
              _canvas.width,
              _canvas.height);
_context.closePath();
_context.fillStyle = BACKGROUNDCOLOR;
_context.fill();

// #1B initialization of the second canevas
_context2.beginPath();
_context2.rect(70,0,500,100);
_context2.lineWidth="5";
_context2.strokeStyle="red";
_context2.closePath();
_context2.fillStyle = "#696969";
_context2.fill();
_context2.fillStyle = "blue"
_context2.font = "20px Verdana";
_context2.fillText("Score : " + score + "",80, 35);
_context2.fillText("Prochaine vague : "+ tempsRestant,300, 35);
_context2.fillText("Ennemis tués : " + nbDeadEnemies + "",80, 85);
_context2.fillText("Vague : "+ vague2,300, 85);



// #2 game object structure
var gameObjects = []; // current game objects
var bulletObjects = []; // current bullet objects
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
});

socket.on('initBullet', function(data) {
    var realData = JSON.parse(data);
    bulletObjects[realData._id] = realData;
    var bbox = {_x:realData._bbox._x,
        _y:realData._bbox._y,
        _w:realData._bbox._w,
        _h:realData._bbox._h};
});

// #3b receive event of update on direction and position of the object
// data._id, data._x, data._y, data._speed
socket.on('gameobject', function (data) {
    var realData = JSON.parse(data);
    gameObjects[realData._id]._bbox._x = realData._x;
    gameObjects[realData._id]._bbox._y = realData._y;
    gameObjects[realData._id]._speed = realData._speed;
});

socket.on('colorchange', function (data) {
    var realData = JSON.parse(data);
    gameObjects[realData._id]._type = realData._type;
});

socket.on('disconnect', function() {
    clearInterval(idBoucle);
    t = Date.now();
    fin = false;
    dead = [];
    temps = 0;
    tempsRestant = 0;
    gameObjects = [];
    bulletObjects = [];
    vague2 = 0;
    vague = 0;
    nbDeadEnemies = 0;
});

socket.on('clearObject', function(data) {
    realData = JSON.parse(data);
    if (realData._type == "deadI"){
        clearDeadObject(realData._id, realData._type);
        gameObjects[realData._id] = null;
    }else if (realData._type == "deadB"){
        clearDeadObject(realData._id, realData._type);
        bulletObjects[realData._id] = null;
    }
});

socket.on('defeat', function () {
    clearInterval(idBoucle);
    _canvas.width = _canvas.width;
    _context.beginPath();
    _context.moveTo(0,0);
    _context.lineTo(640,0);
    _context.lineTo(640,480);
    _context.lineTo(0,480);
    _context.closePath();
    _context.fillStyle = BACKGROUNDCOLOR;
    _context.fill();
    _context.fillStyle = "rgb(255,255,255)";
    _context.font = "20px Verdana";
    _context.fillText("perdu",270, 240);
});

// calculate score
socket.on('score', function (vague, valeur, temps){
    score = score + 100 * vague + valeur + temps;
    if (vague != 0){vague2++;}
    //if (valeur != 0){nbDeadEnemies++;}
});

socket.on('tempsRestant', function (vague){
    tempsRestant = vague;
});

// #4 update and draw all objects
var idBoucle = setInterval(mainLoop, REFRESHTIME);

// #4a main loop
function mainLoop(){
    if(!fin){
        var now = Date.now();
        var dt = now - t;
        t = now;
        updateAll(dt);
        drawAll();
    };
};


// #4b update the position of all game objects
function updateAll(dt){
    var keys = Object.keys(gameObjects);
    var keysBullet = Object.keys(bulletObjects);
    for (var i=0; i<keys.length; ++i){
    	// a Save the old values
    	if (gameObjects[i] != null){
        	// b Update values
        	gameObjects[keys[i]]._bbox._x = gameObjects[keys[i]]._bbox._x
        	    + gameObjects[keys[i]]._speed._h * dt; // update x coordinate
        	gameObjects[keys[i]]._bbox._y = gameObjects[keys[i]]._bbox._y
        	    + gameObjects[keys[i]]._speed._v * dt; // update y coordinate
        }
    };
    for (var i=0; i<keysBullet.length; ++i){
        // a Save the old values
        if (bulletObjects[i] != null){
            // b Update values
            bulletObjects[keysBullet[i]]._bbox._x = bulletObjects[keysBullet[i]]._bbox._x
                + bulletObjects[keysBullet[i]]._speed._h * dt; // update x coordinate
            bulletObjects[keysBullet[i]]._bbox._y = bulletObjects[keysBullet[i]]._bbox._y
                + bulletObjects[keysBullet[i]]._speed._v * dt; // update y coordinate
       }
    };
};

function clearDeadObject(idDead, typeDead){
    if (idDead != null){
        if (typeDead == "deadI"){
            nbDeadEnemies++;
            _context.beginPath();
            _context.rect(gameObjects[idDead]._bbox._x-5,
                 gameObjects[idDead]._bbox._y-5,
                 gameObjects[idDead]._bbox._w+10,
                 gameObjects[idDead]._bbox._h+10);
            _context.closePath();
            _context.fillStyle = BACKGROUNDCOLOR;
            _context.fill();
        }else if (typeDead == "deadB"){
             _context.beginPath();
            _context.rect(bulletObjects[idDead]._bbox._x-5,
                 bulletObjects[idDead]._bbox._y-5,
                 bulletObjects[idDead]._bbox._w+10,
                 bulletObjects[idDead]._bbox._h+10);
            _context.closePath();
            _context.fillStyle = BACKGROUNDCOLOR;
            _context.fill();
        }
    }
}

// #4c draw the game objects to their rightful position
function drawAll(){
    var keys = Object.keys(gameObjects);
    var keysBullet = Object.keys(bulletObjects);
    // a clear the whole screen
    _context.beginPath();
    _context.rect(0,0,_canvas.width,_canvas.height);
    _context.closePath();
    _context.fillStyle = BACKGROUNDCOLOR;
    _context.fill();

    for (var i=0; i<keys.length; ++i){
    	// a clear the old position
    	if(gameObjects[i] != null){
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
                case "deadI":
                    drawEnemyDead(gameObjects[keys[i]]._bbox, "green");
                    break;
        	}
       }
    };
    for (var i=0; i<keysBullet.length; ++i){
        if(bulletObjects[i] != null){
            // b draw the object at its new position
            switch (bulletObjects[keysBullet[i]]._type){
                case "bullet":
                    drawBullet(bulletObjects[keysBullet[i]]._bbox);
                    break;
                case "deadB":
                    drawBulletDead(bulletObjects[keysBullet[i]]._bbox);
                    break;
            }
        }
    };
    
    _context2.beginPath();
    _context2.rect(70,0,500,100);
    _context2.lineWidth="5";
    _context2.strokeStyle="red";
    _context2.closePath();
    _context2.fillStyle = "#696969";
    _context2.fill();
    _context2.fillStyle = "blue"
    _context2.font = "20px Verdana";
    _context2.fillText("Score : " + score + "",80, 35);
    _context2.fillText("Prochaine vague : "+ tempsRestant,300, 35);
    _context2.fillText("Ennemis tués : " + nbDeadEnemies + "",80, 85);
    _context2.fillText("Vague : "+ vague2,300, 85);
};

// Draw the box of the enemy
function drawEnemyDead(bbox, color){
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
    //_context.fillStyle = 'rgb(255,255,255)';
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
    //_context.fillStyle = 'rgb(255,255,255)';
    _context.fill();
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
    //_context.fillStyle = 'rgb(255,255,255)';
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
    //_context.fillStyle = 'rgb(255,255,255)';
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
function drawBulletDead(bbox){
    _context.beginPath();
    _context.arc(bbox._x+bbox._w/2,
         bbox._y+bbox._h/2,
         bbox._w/2, 0, 2 * Math.PI, false);
    _context.closePath();
    _context.lineWidth = 2;
    _context.strokeStyle = 'green';
    _context.stroke();
    _context.fillStyle = 'lightgrey';//lightgrey
    _context.fill();
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