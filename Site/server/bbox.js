
function BBox(x, y, width, height){
    this._x = x;
    this._y = y;
    this._w = width;
    this._h = height;
};


BBox.prototype.isColliding = function( o ) {
    return ((Math.abs(this._x - o._x) * 2 < (this._w + o._w)) &&
            (Math.abs(this._y - o._y) * 2 < (this._h + o._h)));
};

module.exports = BBox;
