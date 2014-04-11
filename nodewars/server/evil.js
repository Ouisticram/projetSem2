var evil = require("http").createServer(httpHandler);
var url = require('url');
var io   = require("socket.io").listen(evil);
var fs   = require("fs");
var grid = require("./grid");
var bbox = require("./bbox");
var REFRESHTIME = 5; // 100ms
var t = Date.now();
// variable contenant la liste de tout les objets sur la map avec leur position actuel
var gameObjects = [];
// variable contenant la liste de tout les objets sur la map avec leur acienne position (dépend du REFRESHTIME)
var gameObjectsOldPosition = [];
// Variable contenant les informations sur le vaisseau du joueur
var player;
// Variable contenant la position des quatre murs du terrain de jeu
var murs = [];
// Sera utilisée quand on fera le code en orienté objet
//var plateau;

// Définition du port sur lequel le serveur écoute
evil.listen(1337);

// fonction qui verifie que l'on se trouve bien sur la bonne page
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

// socket déclenché au chargement de la page
io.sockets.on('connection', function (socket){

    // Variable à utiliser lors du passage à la programmation objet
    //plateau = new grid(640,480,1);
    
    // Initialisation du nombre d'IAs
    var nbObj = 0;
    // Variable qui va servir à initialiser les vaisseaux
    var obj;

    // initialisation de la variable du joueur
    obj = {_id:0,
		  _bbox:{_x:50, _y:50, _w:20, _h:20 },
		  _speed:{_v:0.,_h:0.},
		  _type:"player"};

    // On envoie au client la variable initialisé, pour qu'il l'initialise de son côté
    socket.emit("init", JSON.stringify(obj));
    // On appel la fonction init, pour initialiser la variable joueur du côté serveur
    init(JSON.stringify(obj));    

    // Création des IAs et initialisation du côté client et serveur
    for(var id=1;id<=5;id++){
        obj = {_id:id,
    		  _bbox:{_x:200+Math.random()*200, _y:200+Math.random()*200, _w:20, _h:20 },
    		  _speed:{_v:0,_h:0},
    		  _type:"enemy1"};
        socket.emit("init", JSON.stringify(obj));
        init(JSON.stringify(obj));
        nbObj++;
    }
    
    // Création des box des murs du jeu
    murs[0] = new bbox(640, 240, 1, 480);
    murs[1] = new bbox(0, 240, 1, 480);
    murs[2] = new bbox(320, 0, 640, 1);
    murs[3] = new bbox(320, 480, 640, 1);

    // Varriables à utiliser lors du passage à la programmation objet
    /*plateau.addBBox(player);
    plateau.addBBox(obj[1]);
    plateau.addBBox(obj[2]);
    plateau.addBBox(obj[3]);
    plateau.addBBox(obj[4]);
    plateau.addBBox(obj[5]);*/

    // On lance la fonction mainLoop() tout les X secondes (dépend de la variable REFRESHTIME)
    var id = setInterval(mainLoop, REFRESHTIME);

    // Boucle principale du serveur
    function mainLoop(){
        var now = Date.now();
        var dt = now - t;
        t = now;
        updateAll(dt);
        suiviIA();
        collision();
    };

    // Fonction qui met à jours les positions actuel des objets
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

    // Fonction qui met à jours le déplacement d'un objet
    function updateMoveObject(data) {
        var realData = JSON.parse(data);
        var bbox = {_x:gameObjects[realData._id]._bbox._x,
            _y:gameObjects[realData._id]._bbox._y,
            _w:gameObjects[realData._id]._bbox._w,
            _h:gameObjects[realData._id]._bbox._h};
        gameObjectsOldPosition[realData._id] = bbox;
        gameObjects[realData._id]._bbox._x = realData._x;
        gameObjects[realData._id]._bbox._y = realData._y;
        gameObjects[realData._id]._speed = realData._speed;
    };

    // Fonction qui initialise un objet
    function init(data) {
        var realData = JSON.parse(data);
        gameObjects[realData._id] = realData;
        var bbox = {_x:realData._bbox._x,
            _y:realData._bbox._y,
            _w:realData._bbox._w,
            _h:realData._bbox._h};
        gameObjectsOldPosition[realData._id] = bbox;
    };

    // Fonction qui fais en sort que les IAs suivent le joueur
    function suiviIA(){

        // Récupération des vitesses renvoyées par la fonction move() du joueur
        var ph = move_h();
        var pv = move_v();
        // Déclaration d'une variables qui récupère tout les ids des objets
        var keys = Object.keys(gameObjects);
                
        // On cape la vitesse du joueur, seul le vecteur directeur reste inchangé
        /*if((ph<0)&&(pv<0)){
            while(((ph<-0.05)||(pv<-0.05))){
                ph = ph * 0.95;
                pv = pv * 0.95;
            }
        }else if((ph>0)&&(pv<0)){
            while(((ph>0.05)||(pv<-0.05))){
                ph = ph * 0.95;
                pv = pv * 0.95;
            }
        }else if((ph<0)&&(pv>0)){
            while(((ph<-0.05)||(pv>0.05))){
                ph = ph * 0.95;
                pv = pv * 0.95;
            }
        }else if((ph>0)&&(pv>0)){
            while(((ph>0.05)||(pv>0.05))){
                ph = ph * 0.95;
                pv = pv * 0.95;
            }
        }

        // Mise à jour du joueur
        gameObjects[0]._speed._h = ph;
        gameObjects[0]._speed._v = pv;*/

        // A commenter
        var ux = ((gameObjects[0]._bbox._x)+(gameObjects[0]._speed._h*10));
        var uy = ((gameObjects[0]._bbox._y)+(gameObjects[0]._speed._v*10));

        // On créé une variable qui prend la valeur du nouveau déplacement du joueur
        update_player = {_id:0,
            _x:ux, _y:uy,
            _speed:{_v:pv,_h:ph}
        };

        //On envoie le nouveau déplacement du joueur au client
        socket.emit("gameobject", JSON.stringify(update_player));
        // Mise à jours du déplacement du joueur côté serveur
        updateMoveObject(JSON.stringify(update_player));

        // Mise à jour des IAs
        for(var j=1;j<=nbObj;j++){

            var u_x = ((gameObjects[j]._bbox._x)+(gameObjects[j]._speed._h*10));
            var u_y = ((gameObjects[j]._bbox._y)+(gameObjects[j]._speed._v*10));

            var h = (ux-u_x);
            var v = (uy-u_y);

            if((h<0)&&(v<0)){
                while(((h<-0.05)||(v<-0.05))){
                    h = h * 0.95;
                    v = v * 0.95;
                }
            }else if((h>0)&&(v<0)){
                while(((h>0.05)||(v<-0.05))){
                    h = h * 0.95;
                    v = v * 0.95;
                }
            }else if((h<0)&&(v>0)){
                while(((h<-0.05)||(v>0.05))){
                    h = h * 0.95;
                    v = v * 0.95;
                }
            }else if((h>0)&&(v>0)){
                while(((h>0.05)||(v>0.05))){
                    h = h * 0.95;
                    v = v * 0.95;
                }
            }       

            update = {_id:j,
                 _x:u_x, _y:u_y,
                _speed:{_v:v,_h:h}
            };

            socket.emit("gameobject", JSON.stringify(update));
            updateMoveObject(JSON.stringify(update));
        }
    };

    // Fonction qui gère les collision des objets
    function collision(){

        // Déclaration d'une variables qui récupère tout les ids des objets
        var keys = Object.keys(gameObjects);
        // Variable qui récupère toute les bbox des vaisseau
        var obj = [];
        // Initilisation de la variable touche
        var touche = false;

        // On prend les dernière valeurs dex boxs des vaisseaux
        for (var i=0; i<6;i++){
            obj[i] = new bbox(gameObjects[keys[i]]._bbox._x,gameObjects[keys[i]]._bbox._y,gameObjects[keys[i]]._bbox._w,gameObjects[keys[i]]._bbox._h);
        }
        
        // player VS IA
        for (var i=1; i<6; i++){
            if(obj[0].isColliding(obj[i])){
                touche = true;
            };
        };
            
        // player VS walls
        for (var i=0;i<4;i++){
            if(obj[0].isColliding(murs[i])){
                touche = true;
            };
        };
           
        // IA VS walls
        /*for (var i=1;i<6;i++){
            for (var j=0;j<4;j++){
                if(obj[i].isColliding(murs[j])){
                    var newIA = {_id:i,
                      _bbox:{_x:320, _y:240, _w:20, _h:20 },
                      _speed:{_v:0,_h:0}};
                    socket.emit('gameobject',JSON.stringify(newIA));
                    updateMoveObject(JSON.stringify(newIA));
                };
            };        
        };*/

        // Si le joueur à touché un mur ou un vaisseau ennemi
        if (touche){
                // On stop la boucle côté serveur
                clearInterval(id);
                // On envoie au client que le joueur à perdu
                socket.emit('defeat');
            };
    };

    // socket qui se lance lorsque le client clique sur commit
    socket.on("commit", function(data){
    	var lines = JSON.parse(data);
    	var linearized = lines.join(" ");
    	eval(linearized);
    });
});

// Fonction qui retourne la Nième IA la plus proche
//
// input: n (Rang de l'IA voulue classée par distance)
// return: nearestObj[n] (IA du rang n)
function getNearest(n){
	var distances = [];
	var rangs = [];
	var nearestObj = [];

	for(var l=1;l<=nbObj;l++){
		rangs[l] = 0;
	}

	var distanceNearest = Math.sqrt(
		(gameObjects[0]._bbox._x-gameObjects[1]._bbox._x) * (gameObjects[0]._bbox._x-gameObjects[1]._bbox._x)
		+
		(gameObjects[0]._bbox._y-gameObjects[1]._bbox._y) * (gameObjects[0]._bbox._y-gameObjects[1]._bbox._y)
	);

	for(var j=1;j<nbObj;j++){

		for(var i=2;i<=nbObj;i++){
			if(rangs[i]!=1){
				var distance_i = Math.sqrt(
				(gameObjects[0]._bbox._x-gameObjects[i]._bbox._x) * (gameObjects[0]._bbox._x-gameObjects[i]._bbox._x)
				+
				(gameObjects[0]._bbox._y-gameObjects[i]._bbox._y) * (gameObjects[0]._bbox._y-gameObjects[i]._bbox._y)
				);
				if(distanceNearest>distance_i){
					distanceNearest = distance_i;
					var rang_suppr = i;
					var nObj = gameObjects[i];
				}
			}
		}
		distances[j] = distanceNearest;
		rangs[rang_suppr] = 1;
		nearestObj[j] = nObj;
		distanceNearest = 0;
	}
	return(nearestObj[n]);
};


// Fonction qui retourne la vitesse horizontale de la fonction move()
//
// input: void
// return: h._x (Vitesse horizontale)
function move_h(){
	/*h = move();*/
	return(/*h._x*/0.09);
}

// Fonction qui retourne la vitesse verticale de la fonction move()
//
// input: void
// return: h._x (Vitesse verticale)
function move_v(){
	/*v = move();*/
	return(/*v._y*/0.00);
}

