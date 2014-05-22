var evil = require("http").createServer(httpHandler);
var url = require('url');
var io   = require("socket.io").listen(evil);
var fs   = require("fs");
var grid = require("./grid");
var bbox = require("./bbox");
var REFRESHTIME = 15; // 15ms
var REFRESHTIME2 = 300; // 300ms
var t = Date.now();
// variable contenant la liste de tout les objets sur la map avec leur position actuel
var gameObjects;
// variable contenant la liste de tout les objets sur la map avec leur acienne position (dépend du REFRESHTIME)
var gameObjectsOldPosition;
// current bullet objects
var bulletObjects;
// old bouding box of bullets
var bulletObjectsOldPosition;
// Variable contenant la position des quatre murs du terrain de jeu
var murs;
// Liste des ennemies mort
var morts;
// Variable qui donne un id aux bullets
var idShoot;
// numéro de la vague
var vague;
// temps écoulé depuis le début du jeu en secondes
var temps;
// temps total - temps depuis le début de la vague actuelle
var ancienTemps;

// Définition du port sur lequel le serveur écoute
evil.listen(1337);

/**
 * fonction qui verifie que l'on se trouve bien sur la bonne page
**/
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
    
    // Variable qui va servir à initialiser les vaisseaux
    var obj;
    // Variable qui contient le type d'ennemi
    var ennemi;

    initVariables();

    // initialisation de la variable du joueur
    obj = {_id:0,
		  _bbox:{_x:50, _y:50, _w:20, _h:20 },
		  _speed:{_v:0.08,_h:0},
		  _type:"player"};
    // On appel la fonction init, pour initialiser la variable joueur
    init(JSON.stringify(obj));    

    // Création des IAs et initialisation du côté client et serveur
    /*for(var id=1;id<=5;id++){
        morts[id] = 1;
        switch (id) {
            case 1 :
                ennemi = "enemy1"
                break;
            case 2 :
                ennemi = "enemy2"
                break;
            case 3 :
                ennemi = "enemy2"
                break;
            case 4 :
                ennemi = "enemy1"
                break;
            case 5 :
                ennemi = "enemy3"
                break;
            default :
                ennemi = "enemy1"
                break;
        };
        obj = {_id:id,
    		  _bbox:{_x:100+Math.random()*200, _y:100+Math.random()*200, _w:20, _h:20 },
    		  _speed:{_v:0.01,_h:0},
    		  _type:ennemi};
        init(JSON.stringify(obj));
    };*/
    
    // Création des box des murs du jeu
    murs[0] = new bbox(630, 240, 1, 480); // droit
    murs[1] = new bbox(-10, 240, 1, 480); // gauche
    murs[2] = new bbox(320, -10, 640, 1); // haut
    murs[3] = new bbox(320, 470, 640, 1); // bas

    // On lance la fonction mainLoop() tout les X secondes (dépend de la variable REFRESHTIME)
    var idMainBoucle = setInterval(mainLoop, REFRESHTIME);
    // On lance la fonction shoot tout les X secondes (dépend de la variable REFRESHTIME2)
    var idShotBoucle = setInterval(shoot, REFRESHTIME2);

    /**
     * Boucle principale du serveur
    **/
    function mainLoop(){
        var now = Date.now();
        var dt = now - t;
        t = now;

        //console.log(gameObjects);

        if (ancienTemps + vague * 2 <= temps) // 10s de plus par vague
        {
            vague++;
            newWave(vague);
            ancienTemps = ancienTemps + temps; 
        } 
        updateAll(dt);
        suiviIA();
        collision();

        update_player = {_id:0,
            _x:gameObjects[0]._bbox._x,
            _y:gameObjects[0]._bbox._y,
            _speed:{_v:move_v(),_h:move_h()}
        };

        updateMoveObject(JSON.stringify(update_player));
        
        temps = temps + 0.001 * REFRESHTIME; 
        //REFRESHTIME = 5 ==> 100 ms, au bout de 1 tour, on a temps = 0 + 100 * 0.001 = 0.1s
    };

    /**
     * Fonction qui met à jour les positions actuel des objets
     * @param dt temps depuis la dernière mise à jour
    **/
    function updateAll(dt){
        var keys = Object.keys(gameObjects);
        var keysBullet = Object.keys(bulletObjects);
        for (var i=0; i<keys.length; i++){
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
        for (var i=0; i<keysBullet.length; i++){
            // a Save the old values
            var bboxbullet = {_x:bulletObjects[keysBullet[i]]._bbox._x,
                    _y:bulletObjects[keysBullet[i]]._bbox._y,
                    _w:bulletObjects[keysBullet[i]]._bbox._w,
                    _h:bulletObjects[keysBullet[i]]._bbox._h};
            bulletObjectsOldPosition[keysBullet[i]] = bboxbullet;
            // b Update values
            bulletObjects[keysBullet[i]]._bbox._x = bulletObjects[keysBullet[i]]._bbox._x
                + bulletObjects[keysBullet[i]]._speed._h * dt; // update x coordinate
            bulletObjects[keysBullet[i]]._bbox._y = bulletObjects[keysBullet[i]]._bbox._y
                + bulletObjects[keysBullet[i]]._speed._v * dt; // update y coordinate
        };
    };

    /**
     * Fonction qui met à jour le déplacement d'un objet
     * @param data Variable contenant les informations de l'objet à mettre à jour
    **/
    function updateMoveObject(data) {
        var realData = JSON.parse(data);
        socket.emit("gameobject", data);
        var bbox = {_x:gameObjects[realData._id]._bbox._x,
            _y:gameObjects[realData._id]._bbox._y,
            _w:gameObjects[realData._id]._bbox._w,
            _h:gameObjects[realData._id]._bbox._h};
        gameObjectsOldPosition[realData._id] = bbox;
        gameObjects[realData._id]._bbox._x = realData._x;
        gameObjects[realData._id]._bbox._y = realData._y;
        gameObjects[realData._id]._speed = realData._speed;
    };

    /**
     * Fonction qui initialise un objet
     * @param data Variable contenant les informations de l'objet à initialiser
    **/
    function init(data) {
        var realData = JSON.parse(data);
        socket.emit("init", data);
        gameObjects[realData._id] = realData;
        var bbox = {_x:realData._bbox._x,
            _y:realData._bbox._y,
            _w:realData._bbox._w,
            _h:realData._bbox._h};
        gameObjectsOldPosition[realData._id] = bbox;
    };

    /**
     * Fonction qui dit au serveur d'effacer un vaisseau
     * @param data Variable contenant l'id du vaisseau à effacer
    **/
    function clear(data) {
        socket.emit("clearObject",data);
    };

    /**
     * Fonction qui fais en sorte que les IAs suivent le joueur
    **/
    function suiviIA(){

        // Récupération des vitesses renvoyées par la fonction move() du joueur
        var ph = move_h();
        var pv = move_v();
        // Déclaration d'une variables qui récupère tout les ids des objets
        var keys = Object.keys(gameObjects);
                
        // On cape la vitesse du joueur, seul le vecteur directeur reste inchangé
        if((ph<0)&&(pv<0)){
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
        /*gameObjects[0]._speed._h = ph;
        gameObjects[0]._speed._v = pv;*/

        // A commenter
        var ux = ((gameObjects[0]._bbox._x)+(gameObjects[0]._speed._h*10));
        var uy = ((gameObjects[0]._bbox._y)+(gameObjects[0]._speed._v*10));

        // On créé une variable qui prend la valeur du nouveau déplacement du joueur
        update_player = {_id:0,
            _x:ux, _y:uy,
            _speed:{_v:pv,_h:ph}
        };

        // Mise à jours du déplacement du joueur
        updateMoveObject(JSON.stringify(update_player));

        // Mise à jour des IAs
        for(var j=1;j<gameObjects.length;j++){

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

            updateMoveObject(JSON.stringify(update));
        };
    };

    // Fonction qui organise le pop des vagues d'IA
    function newWave(vague){

        for(var id=1;id<=3*vague;id++){
            obj = {_id:id,
                _bbox:{_x:200+Math.random()*200, _y:200+Math.random()*200, _w:20, _h:20 },
                _speed:{_v:0.05,_h:0},
                _type:"enemy1"};
            init(JSON.stringify(obj));
            //nbObj++;
        }
    };

    /**
     * Fonction qui gère la collision des objets
    **/
    function collision(){

        // Déclaration d'une variables qui récupère tout les ids des vaisseaux
        var keys = Object.keys(gameObjects);
        // Déclaration d'une variables qui récupère tout les ids des bullets
        var keysBullet = Object.keys(bulletObjects);
        // Variable qui récupère toute les bbox des vaisseau
        var bboxIA = [];
        // Variable qui récupère toute les bbox des bullets
        var bboxBullet = [];
        // Initilisation de la variable touche
        var touche = false;

        // On prend les dernière valeurs des boxs des vaisseaux
        for (var i=0; i<gameObjects.length;i++){
            bboxIA[i] = new bbox(gameObjects[keys[i]]._bbox._x,gameObjects[keys[i]]._bbox._y,gameObjects[keys[i]]._bbox._w,gameObjects[keys[i]]._bbox._h);
        };
        // On prend les dernière valeurs des boxs des bullets
        for (var i=0; i<bulletObjects.length;i++){
            if (bulletObjects != []){
                bboxBullet[i] = new bbox(bulletObjects[keysBullet[i]]._bbox._x,bulletObjects[keysBullet[i]]._bbox._y,bulletObjects[keysBullet[i]]._bbox._w,bulletObjects[keysBullet[i]]._bbox._h);
            };
        };
        
        // player VS IA
        for (var i=1; i<bboxIA.length; i++){
            if(bboxIA[0].isColliding(bboxIA[i])){
                touche = true;
            };
        };
            
        // player VS walls
        for (var i=0;i<4;i++){
            if((bboxIA[0]._x>=640) || (bboxIA[0]._x<=0) || (bboxIA[0]._y>=480) || (bboxIA[0]._y<=0)){
                touche = true;
            };
        };
           
        // IA VS walls
        for (var i=1;i<bboxIA.length;i++){
            for (var j=0;j<4;j++){
                if(bboxIA[i].isColliding(murs[j]) && morts[i] == 1){
                    var newIA = {
                      _id   : i,
                      _type : "deadI"
                    };
                    // A décommenter pour voir les IAs faire des mouvements aléatoire
                    /*if(gameObjects[keys[i]]._speed._v > 0 && gameObjects[keys[i]]._speed._h <= 0){
                        var update = {_id:i,
                             _x:gameObjects[keys[i]]._bbox._x, 
                             _y:gameObjects[keys[i]]._bbox._y,
                            _speed:{_v:-0.05,_h:0.05}
                        };
                    }else if(gameObjects[keys[i]]._speed._v < 0 && gameObjects[keys[i]]._speed._h > 0){
                        var update = {_id:i,
                             _x:gameObjects[keys[i]]._bbox._x, 
                             _y:gameObjects[keys[i]]._bbox._y,
                            _speed:{_v:0.05,_h:0.05}
                        };
                    }else if(gameObjects[keys[i]]._speed._v > 0 && gameObjects[keys[i]]._speed._h > 0){
                        var update = {_id:i,
                             _x:gameObjects[keys[i]]._bbox._x, 
                             _y:gameObjects[keys[i]]._bbox._y,
                            _speed:{_v:-0.05,_h:-0.05}
                        };
                    }else if(gameObjects[keys[i]]._speed._v < 0 && gameObjects[keys[i]]._speed._h < 0){
                        var update = {_id:i,
                             _x:gameObjects[keys[i]]._bbox._x, 
                             _y:gameObjects[keys[i]]._bbox._y,
                            _speed:{_v:0.05,_h:-0.05}
                        };
                    }
                    updateMoveObject(JSON.stringify(update));*/
                    morts[i] = 0;
                    gameObjects[i]._bbox._w = 0;
                    gameObjects[i]._bbox._h = 0;
                    clear(JSON.stringify(newIA));
                };
            };        
        };

        // IA VS Bullets
        for (var i=0;i<bboxBullet.length;i++)
        {
            for (var j=1;j<bboxIA.length;j++)
            {
                if (bboxIA[j].isColliding(bboxBullet[i]))
                {
                    var newIA = {
                      _id   : j,
                      _w : 0,
                      _h : 0,
                      _type : "deadI"
                    };
                    var newBullet = {
                      _id   : i,
                      _w : 0,
                      _h : 0,
                      _type : "deadB"
                    };
                    morts[j] = 2;
                    bulletObjects[i]._bbox._w = 0;
                    bulletObjects[i]._bbox._h = 0;
                    gameObjects[j]._bbox._w = 0;
                    gameObjects[j]._bbox._h = 0;
                    clear(JSON.stringify(newIA));
                    clear(JSON.stringify(newBullet));
                 };
            };
        };

        // Si le joueur à touché un mur ou un vaisseau ennemi
        if (touche){
            // On stop les boucles côté serveur
            clearInterval(idMainBoucle);
            clearInterval(idShotBoucle);
            // On envoie au client que le joueur à perdu
            socket.emit('defeat');
        };
    };

    /**
    *
    **/
    function initVariables(){
        t = Date.now();
        gameObjects = [];
        gameObjectsOldPosition = [];
        bulletObjects = [];
        bulletObjectsOldPosition = [];
        murs = [];
        morts = [];
        idShoot = 0;
        vague = 0;
        temps = 0;
        ancienTemps = 0;
    };

    /** 
    * Fonction de mouvement possiblement entrable par le joueur (WorkInProgress)
     @return M Correspond au couple de vitesse horizontale et vitesse verticale de l'objet
    **/
    function move(){

        /*
        var nearest = getNearest(1);
        var distanceNearest = Math.sqrt((pla[0]._bbox._x-nearest._x) * 
                            (pla[0]._bbox._x-nearest._x)+(pla[0]._bbox._y-nearest._y) * (pla[0]._bbox._y-nearest._y));

        //640*480
        if(pla[0]._bbox._x>=320){
            var bordLeft = 0;
            var distBord = 640 - pla[0]._bbox._x;
        }else{
            var bordLeft = 1;
            var distBord = pla[0]._bbox._x;
        }
        if(pla[0]._bbox._y>=240){
            var bordTop = 0;
            var distBord = 480 - pla[0]._bbox._y;
        }else{
            var bordTop = 1;
            var distBord = pla[0]._bbox._y;
        }

        var coin = 0;

        if(bordTop==1){
            if(bordLeft==1){
                coin = 0;
            }else{
                coin = 1;
            }
        }else{
            if(bordLeft==1){
                coin = 2;
            }else{
                coin = 3;
            }
        }

        var x;
        var y;

        switch(coin){
            case 0:
                x = 1; y = 1;
                break;
            case 1:
                x = -1; y = 1;
                break;
            case 2:
                x = -1; y = -1;
                break;
            case 3:
                x = 1; y = -1;
                break;
        }

        if(distanceNearest>distBord){

        }*/

        var dir = [];

        //640*480
        if((gameObjects[0]._bbox._x<100)&&(gameObjects[0]._bbox._y<380)){
            dir[0] = 0.00;
            dir[1] = 0.1;
        } else{
            if((gameObjects[0]._bbox._x<540)&&(gameObjects[0]._bbox._y>=380)){
                dir[0] = 0.1;
                dir[1] = 0.00;
            } else{
                if((gameObjects[0]._bbox._x>=540)&&(gameObjects[0]._bbox._y>=100)){
                    dir[0] = 0.00;
                    dir[1] = -0.1;
                } else{
                    if((gameObjects[0]._bbox._x>=100)&&(gameObjects[0]._bbox._y<100)){
                        dir[0] = -0.1;
                        dir[1] = 0.00;
                    }
                }
            }
        }
        var M = {
            _x:dir[0],
            _y:dir[1]};

        M = {
           _x:0,
           _y:0}; 

        return (M);
    };

    /**
     * Fonction qui retourne la vitesse horizontale de la fonction move()
     * @return: h._x (Vitesse horizontale)
    **/
    function move_h(){
        h = move();
        return(h._x);
    }

    /** 
     * Fonction qui retourne la vitesse verticale de la fonction move()
     * @return v._y (Vitesse verticale)
    **/ 
    function move_v(){
        v = move();
        return(v._y);
    }

    /**
    * Fonction qui envoie les bullets au client 
    **/
    function shoot(){
        obj = {_id:idShoot,
              _bbox:{_x:gameObjects[0]._bbox._x, 
                    _y:gameObjects[0]._bbox._y,
                    _w:5,
                    _h:5},
              _speed:{_v:0.1,_h:0.1},
              _type:"bullet"
        };
        bulletObjects[obj._id] = obj;
        var bbox = {_x:obj._bbox._x,
            _y:obj._bbox._y,
            _w:obj._bbox._w,
            _h:obj._bbox._h};
        bulletObjectsOldPosition[obj._id] = bbox;
        socket.emit('initBullet',JSON.stringify(obj));
        idShoot++;
        idShoot %= 80;
    };

    // socket qui se lance lorsque le client clique sur commit
    socket.on("commit", function(data){
    	var lines = JSON.parse(data);
    	var linearized = lines.join(" ");
    	eval(linearized);
    });
});


/**
 * Fonction qui retourne la Nième IA la plus proche
 * @param n Rang de l'IA voulue classée par distance
 * @return: nearestObj[n] IA du rang n
**/
function getNearest(n){
	var distances = [];
	var rangs = [];
	var nearestObj = [];

	for(var l=1;l<=gameObjects.length;l++){
		rangs[l] = 0;
	}

	var distanceNearest = Math.sqrt(
		(gameObjects[0]._bbox._x-gameObjects[1]._bbox._x) * (gameObjects[0]._bbox._x-gameObjects[1]._bbox._x)
		+
		(gameObjects[0]._bbox._y-gameObjects[1]._bbox._y) * (gameObjects[0]._bbox._y-gameObjects[1]._bbox._y)
	);

	for(var j=1;j<gameObjects.length;j++){

		for(var i=2;i<=gameObjects.length;i++){
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