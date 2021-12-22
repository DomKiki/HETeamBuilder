class Point {
  
	constructor(x, y) {
		this.x = (x === undefined) ? -1 : x;
		this.y = (y === undefined) ? -1 : y;
	}
  
  unset() { this.x = -1; this.y = -1; }
  
  isSet() { return ((this.x != -1) && (this.y != -1)); }
  
  distTo(p) { return new Point(p.x - this.x, p.y - this.y); };
  
}