var evil = require("http").createServer(httpHandler);
var url = require('url');
var io   = require("socket.io").listen(evil);
var fs   = require("fs");
var grid = require("./grid");
var bbox = require("./bbox");
var REFRESHTIME = 15; // 15ms
var REFRESHTIME2 = 500; // 500ms
var REFRESHTIME3 = 1000; // 1 seconde

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
    if (page=="/about"){
        fs.readFile("../client/about.html", function (err, data) {
            if (err){
                res.writeHead(500);
                return res.end("No about found");
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
    // temps actuel
    var t;
    // variable contenant la liste de tout les objets sur la map avec leur position actuel
    var gameObjects;
    // current bullet objects
    var bulletObjects;
    // variable contenant la position des quatre murs du terrain de jeu
    var murs;
    // liste des ennemies mort
    var morts;
    // variable qui donne un id aux bullets
    var idShoot;
    // numéro de la vague
    var vague;
    // temps écoulé depuis le début du jeu en secondes
    var temps;
    // temps total - temps depuis le début de la vague actuelle
    var ancienTemps;
    // code de l'utilisateur récupéré par le commit
    var linearized;
    // variable qui gère l'intervale de temps entre les tirs
    var tpshoot;
    // variable qui gère l'intervale de temps entre les mise à jour de déplacement d'IA
    var tpsIA;
    // variable qui gère l'intervale de temps entre les mise à jour de déplacement du joueur
    var tpsmove;
    // temps
    var accu;
    // temps
    var accu2;
    // temps restant avant la prochaine vague
    var tempsNextWave;
    // Variable qui va servir à initialiser les vaisseaux
    var obj;
    // Variable qui contient le type d'ennemi
    var ennemi;

    initVariables();

    // initialisation de la variable du joueur
    obj = {_id:0,
		  _bbox:{_x:50, _y:50, _w:20, _h:20 },
		  _speed:{_v:0,_h:0},
		  _type:"player"};
    // On appel la fonction init, pour initialiser la variable joueur
    init(obj);
    
    // Création des box des murs du jeu
    murs[0] = new bbox(630, 240, 1, 480); // droit
    murs[1] = new bbox(-10, 240, 1, 480); // gauche
    murs[2] = new bbox(320, -10, 640, 1); // haut
    murs[3] = new bbox(320, 470, 640, 1); // bas

    // On lance la fonction mainLoop() tout les X secondes (dépend de la variable REFRESHTIME)
    var idMainBoucle;

    //console.log("l'id de l'utilisateur est "+io.sockets.socket(id));

    /**
     * Boucle principale du serveur
    **/
    function mainLoop(){
        var now = Date.now();
        var dt = now - t;
        t = now;

        if (accu < 1) socket.emit('tempsRestant',accu2);
        accu += dt;
        tpshoot += dt;
        tpsIA += dt;
        tpsmove += dt;

        if (accu >= 1000) 
        {   
            accu2--;
            socket.emit('tempsRestant',accu2);
            if (accu2 == 0) accu2 = tempsNextWave*(vague+1);
            accu = accu - 1000;
            socket.emit('score',0,0,10);
        }

        if ((ancienTemps + vague * tempsNextWave) <= temps) // 5s de plus par vague
        {
            socket.emit('score',vague,0,0);
            vague++;
            newWave(vague);
            ancienTemps = temps; 
        }
        updateAll(dt);
        suiviIA();
        collision();

        eval(linearized);
        
        temps = temps + 0.001 * dt;
    };

    function move(x,y){
        if (tpsmove >= REFRESHTIME3){

            var h = (x-gameObjects[0]._bbox._x);
            var v = (y-gameObjects[0]._bbox._y);

            if(Math.abs(v)>Math.abs(h)){
                h = (h * 0.1) / Math.abs(v);
                if (v < 0) v = -0.1;
                else if (v > 0) v = 0.1;
                else v = 0;
            }else{
                v = (v * 0.1) / Math.abs(h);
                if (h < 0) h = -0.1;
                else if (h > 0) h = 0.1;
                else h = 0;
            }

            update_player = {_id:0,
                _x:gameObjects[0]._bbox._x,
                _y:gameObjects[0]._bbox._y,
                _speed:{_v:v,_h:h}
            };

            updateMoveObject(update_player);
            tpsmove = 0;
        }
    }

    /**
     * Fonction qui met à jour les positions actuel des objets
     * @param dt temps depuis la dernière mise à jour
    **/
    function updateAll(dt){
        var keys = Object.keys(gameObjects);
        var keysBullet = Object.keys(bulletObjects);
        for (var i=0; i<keys.length; i++){
            // b Update values
            if(gameObjects[i] != null){
                gameObjects[keys[i]]._bbox._x = gameObjects[keys[i]]._bbox._x
                    + gameObjects[keys[i]]._speed._h * dt; // update x coordinate
                gameObjects[keys[i]]._bbox._y = gameObjects[keys[i]]._bbox._y
                + gameObjects[keys[i]]._speed._v * dt; // update y coordinate
            }
        }
        for (var i=0; i<keysBullet.length; i++){
            // b Update values
            if(bulletObjects[i] != null){
                bulletObjects[keysBullet[i]]._bbox._x = bulletObjects[keysBullet[i]]._bbox._x
                    + bulletObjects[keysBullet[i]]._speed._h * dt; // update x coordinate
                bulletObjects[keysBullet[i]]._bbox._y = bulletObjects[keysBullet[i]]._bbox._y
                    + bulletObjects[keysBullet[i]]._speed._v * dt; // update y coordinate
            }
        }
    };

    /**
     * Fonction qui met à jour le déplacement d'un objet
     * @param data Variable contenant les informations de l'objet à mettre à jour
    **/
    function updateMoveObject(data) {
        socket.emit('gameobject', JSON.stringify(data));
        gameObjects[data._id]._bbox._x = data._x;
        gameObjects[data._id]._bbox._y = data._y;
        gameObjects[data._id]._speed = data._speed;
    };

    /**
     * Fonction qui initialise un objet
     * @param data Variable contenant les informations de l'objet à initialiser
    **/
    function init(data) {
        socket.emit('init', JSON.stringify(data));
        gameObjects[data._id] = data;
        morts[data._id] = 1;
    };

    /**
    * Fonction qui change le type d'un ennemi
    * @param data Variable contenant le nouveau type de l'IA
    **/
    function changeColor(data){
        socket.emit('colorchange',JSON.stringify(data));
        gameObjects[data._id]._type = data._type;
    };

    /**
     * Fonction qui dit au serveur d'effacer un vaisseau
     * @param data Variable contenant l'id du vaisseau à effacer
    **/
    function clear(data) {
        socket.emit('clearObject',JSON.stringify(data));
    };

    /**
     * Fonction qui fais en sorte que les IAs suivent le joueur
    **/
    function suiviIA(){

        if (tpsIA >= REFRESHTIME3){

            // Player
            var ux = ((gameObjects[0]._bbox._x)+(gameObjects[0]._speed._h*10));
            var uy = ((gameObjects[0]._bbox._y)+(gameObjects[0]._speed._v*10));

            // Mise à jour des IAs
            for(var j=1;j<gameObjects.length;j++){

                if(morts[j] == 1  && gameObjects[j] != null){
                    // IA
                    var u_x = ((gameObjects[j]._bbox._x)+(gameObjects[j]._speed._h*10));
                    var u_y = ((gameObjects[j]._bbox._y)+(gameObjects[j]._speed._v*10));

                    var h = (ux-u_x);
                    var v = (uy-u_y);

                    if(gameObjects[j]._type == "enemy1"){
                        if(Math.abs(v)>Math.abs(h)){
                            h = (h * 0.08) / Math.abs(v);
                            if (v < 0) v = -0.08;
                            else if (v > 0) v = 0.08;
                            else v = 0;
                        }else{
                            v = (v * 0.08) / Math.abs(h);
                            if (h < 0) h = -0.08;
                            else if (h > 0) h = 0.08;
                            else h = 0;
                        }
                    }else if(gameObjects[j]._type == "enemy2"){
                        if(Math.abs(v)>Math.abs(h)){
                            h = (h * 0.06) / Math.abs(v);
                            if (v < 0) v = -0.06;
                            else if (v > 0) v = 0.06;
                            else v = 0;
                        }else{
                            v = (v * 0.06) / Math.abs(h);
                            if (h < 0) h = -0.06;
                            else if (h > 0) h = 0.06;
                            else h = 0;
                        }
                    }else if(gameObjects[j]._type == "enemy3"){
                        if(Math.abs(v)>Math.abs(h)){
                            h = (h * 0.04) / Math.abs(v);
                            if (v < 0) v = -0.04;
                            else if (v > 0) v = 0.04;
                            else v = 0;
                        }else{
                            v = (v * 0.04) / Math.abs(h);
                            if (h < 0) h = -0.04;
                            else if (h > 0) h = 0.04;
                            else h = 0;
                        }
                    }else console.log("connais pas ce type de vaisseau !");

                    update = {_id:j,
                         _x:u_x, _y:u_y,
                        _speed:{_v:v,_h:h}
                    }

                    updateMoveObject(update);
                }
            }
            tpsIA = 0;
        }
    };

    // Fonction qui organise le pop des vagues d'IA
    function newWave(vague){

        var nbObj = 0;
        var id = 1;

        while(nbObj != 3*vague){
            if (morts[id] != 1){
                var xIA = Math.random() * 640;
                var yIA = Math.random() * 480;
                var xPlayer = gameObjects[0]._bbox._x;
                var yPlayer = gameObjects[0]._bbox._y;
                while((Math.sqrt(Math.pow((xPlayer - xIA),2) + Math.pow((yPlayer - yIA),2))) <= 200)
                {
                    xIA = Math.random() * 640;
                    yIA = Math.random() * 480;
                }
                obj = {_id:id,
                    _bbox:{_x:xIA, _y:yIA, _w:20, _h:20 },
                    _speed:{_v:0.05,_h:0},
                    _type:"enemy3"};
                init(obj);
                nbObj++;
            }            
            id++;
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
            if (gameObjects[keys[i]] != null){
                bboxIA[i] = new bbox(gameObjects[keys[i]]._bbox._x,gameObjects[keys[i]]._bbox._y,gameObjects[keys[i]]._bbox._w,gameObjects[keys[i]]._bbox._h);
            }
        }
        // On prend les dernière valeurs des boxs des bullets
        for (var i=0; i<bulletObjects.length;i++){
            if (bulletObjects != [] && bulletObjects[keysBullet[i]] != null){
                bboxBullet[i] = new bbox(bulletObjects[keysBullet[i]]._bbox._x,bulletObjects[keysBullet[i]]._bbox._y,bulletObjects[keysBullet[i]]._bbox._w,bulletObjects[keysBullet[i]]._bbox._h);
            }
        }
        
        // player VS IA
        for (var i=1; i<bboxIA.length; i++){
            if(morts[i] == 1){
                if(bboxIA[0].isColliding(bboxIA[i])){
                    touche = true;
                }
            }
        }
            
        // player VS walls
        for (var i=0;i<4;i++){
            if(bboxIA[0].isColliding(murs[i])){
                touche = true;
            }
        }
           
        // IA VS walls
        for (var i=1;i<bboxIA.length;i++){
            for (var j=0;j<4;j++){
                if(morts[i] == 1){
                    if(bboxIA[i].isColliding(murs[j])){
                        morts[i] = 0;

                        gameObjects[i] = null;

                        obj = {
                            _id : i,
                            _type : "deadI"
                        };

                        clear(obj);
                    }
                }
            }        
        }

        // IA VS Bullets
        for (var i=0;i<bboxBullet.length;i++)
        {
            for (var j=1;j<bboxIA.length;j++)
            {
                if (morts[j] == 1 && bboxBullet[i] != null) {
                    if (bboxIA[j].isColliding(bboxBullet[i]))
                    {
                        
                        var typeIA = gameObjects[j]._type;
                        var val = 0;
                        
                        if (typeIA == "enemy1") {
                            morts[j] = 2;
                            val = 10;
                            gameObjects[j] = null;
                            objI = {
                                _id : j,
                                _type : "deadI"
                            };
                            clear(objI);                            
                        }
                        else if (typeIA == "enemy2") {
                            val = 20;
                            objI2 = {
                                _id : j,
                                _type : "enemy1"
                            }
                            changeColor(objI2);
                        } 
                        else if (typeIA == "enemy3") {
                            val = 30;
                            objI3 = {
                                _id : j,
                                _type : "enemy2"
                            }
                            changeColor(objI3);
                        } 
                        
                        bulletObjects[i] = null;

                        objB = {
                            _id : i,
                            _type : "deadB"
                        };
                        
                        clear(objB);
                        
                        socket.emit('score',0,val,0);
                     }
                }
            }
        }

        for (var i=0; i<gameObjects.length;i++){
            if(morts[j] == 1){
                if (gameObjects[keys[i]]._bbox._x > 640 || gameObjects[keys[i]]._bbox._x < 0 || gameObjects[keys[i]]._bbox._y > 480 || gameObjects[keys[i]]._bbox._y < 0){
                    gameObjects[i] = null;
                    morts[i] = 0;
                    objI = {
                        _id : i,
                        _type : "deadI"
                    };
                    clear(objI);
                }
            }
        }

        // Si le joueur à touché un mur ou un vaisseau ennemi
        if (touche){
            // On stop les boucles côté serveur
            clearInterval(idMainBoucle);
            // On envoie au client que le joueur à perdu
            socket.emit('defeat');
        }
    };

    /**
    * Fonction qui initialise les variables du côté serveur
    **/
    function initVariables(){
        t = Date.now();
        gameObjects = [];
        bulletObjects = [];
        murs = [];
        morts = [];
        idShoot = 0;
        vague = 0;
        temps = 0;
        ancienTemps = 0;
        accu = 0;
        tpshoot = 0;
        tpsIA = REFRESHTIME3;
        tpsmove = REFRESHTIME3;
        tempsNextWave = 5;
        accu2 = tempsNextWave;
        linearized = "";
    };

    /**
     * Fonction qui retourne la Nième IA la plus proche
     * @param n Rang de l'IA voulue classée par distance
     * @return nearestObj[n] IA du rang n
    **/
    function getNearest(n){
        var rangs = [];
        var nearestObj = [];
        var vivant = 0;
        var trouve = false;
        var obj = null;
        var nbVivant = 0;
        var nObj = [];

        for(var l=1;l<gameObjects.length;l++){
            if (morts[l] == 1){
                nbVivant++;
            }
        }

        if (nbVivant < 1 || n < 1){
            obj = {
                _x : -1,
                _y : -1
            };
        }else{

            var cpt = 0;
            var tmp;

            for(var i=1;i<gameObjects.length;i++){
                if(morts[i] == 1){
                    tmp = Math.sqrt(
                        (gameObjects[0]._bbox._x-gameObjects[i]._bbox._x) * (gameObjects[0]._bbox._x-gameObjects[i]._bbox._x)
                        +
                        (gameObjects[0]._bbox._y-gameObjects[i]._bbox._y) * (gameObjects[0]._bbox._y-gameObjects[i]._bbox._y));
                    objtmp = {
                        _id : i,
                        _val : tmp
                    }
                    nObj[cpt] = objtmp;
                    cpt++;
                }
            }

            var triVal = function(a, b){
              if (a._val < b._val) return -1;
              if (a._val > b._val) return 1;
              if (a._val == b._val) return 0;
            }

            nObj.sort(triVal);

            if(nObj[n-1] != null){
                obj = {
                    _x : gameObjects[nObj[n-1]._id]._bbox._x,
                    _y : gameObjects[nObj[n-1]._id]._bbox._y
                };
            }else{
                obj = {
                    _x : -1,
                    _y : -1
                };
            }
        }
            
        return(obj);
    };

    /**
    * Fonction qui envoie les bullets au client 
    **/
    function shoot(x, y){
        if (tpshoot >= REFRESHTIME2){

            var shoot_h = (x-gameObjects[0]._bbox._x);
            var shoot_v = (y-gameObjects[0]._bbox._y);

            if(Math.abs(shoot_v)>Math.abs(shoot_h)){
                shoot_h = (shoot_h * 0.1) / Math.abs(shoot_v);
                if (shoot_v < 0) shoot_v = -0.1;
                else if (shoot_v > 0) shoot_v = 0.1;
                else shoot_v = 0;
            }else{
                shoot_v = (shoot_v * 0.1) / Math.abs(shoot_h);
                if (shoot_h < 0) shoot_h = -0.1;
                else if (shoot_h > 0) shoot_h = 0.1;
                else shoot_h = 0;
            }

            obj = {_id:idShoot,
                  _bbox:{_x:gameObjects[0]._bbox._x, 
                        _y:gameObjects[0]._bbox._y,
                        _w:5,
                        _h:5},
                  _speed:{_v:2*shoot_v,_h:2*shoot_h},
                  _type:"bullet"
            };
            bulletObjects[obj._id] = obj;
            socket.emit('initBullet',JSON.stringify(obj));
            idShoot++;
            idShoot %= 80;
            tpshoot = 0;
        }
    };
    
    socket.on('disconnect', function(){
        clearInterval(idMainBoucle);
        initVariables();
    });

    // socket qui se lance lorsque le client clique sur commit
    socket.on('commit', function(data){
    	var lines = JSON.parse(data);
    	linearized = lines.join(" ");
    	t = Date.now();
        if (!idMainBoucle) idMainBoucle = setInterval(mainLoop, REFRESHTIME);
    });
});