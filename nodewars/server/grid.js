
function Grid(width, height, cellSize){
    this._w = width;
    this._h = height;
    this._c = cellSize;
    this._length = 0;

    this._grid = []; // init grid
};

Grid.prototype.length = function(){
    return this._length;
};

Grid.prototype.addBBox = function(box) {
    var xGrid = Math.floor(box._x / this._c);
    var yGrid = Math.floor(box._y / this._c);
    var oxGrid = Math.ceil( (box._x + box._w - 1) / this._c);
    var oyGrid = Math.ceil( (box._y + box._h - 1) / this._c);

    for (var i = xGrid; i <= oxGrid; ++i){
    	if (!(i in this._grid)){
    	    this._grid[i] = [];
    	}
    	for (var j = yGrid; j<= oyGrid; ++j){
    	    if (!(j in this._grid[i])){
    		this._grid[i][j] = [];
    	    };
    	    this._grid[i][j][this._grid[i][j].length] = box;
    	};
    };
    this._length++;
};

Grid.prototype.getBBoxes = function(box) {
    var listBBoxes = [];
    var xGrid = Math.floor(box._x / this._c);
    var yGrid = Math.floor(box._y / this._c);
    var oxGrid = Math.ceil((box._x + box._w - 1) / this._c);
    var oyGrid = Math.ceil((box._y + box._h - 1) / this._c);

    for (var i = xGrid; i <= oxGrid; ++i){
    	if (i in this._grid){
        	    for (var j = yGrid; j<= oyGrid; ++j){
        		if (j in this._grid[i]){
        		    if (this._grid[i][j].length > 0){
        			listBBoxes[listBBoxes.length] = this._grid[i][j];
        		    };
        		};
    	    };
    	};
    };
    return listBBoxes;
};

module.exports = Grid;
