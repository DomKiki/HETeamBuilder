/*********************** To do ***********************
	Task															Difficulty
- Make Trait class, consolidating races/classes icons in arrays			C+
- Import/Export team as file											C-

/****************** Global variables *****************/

const CANVAS_H        = 900;
const CANVAS_W        = 1800;
const GRID_H          = 2;
const GRID_W          = 3;
const GRID_TOP_OFFSET = 50;
const TILE_W          = 100;
var   TILE_H;
const TILE_OFFSET     = 8;
const POOL_OFFSET     = 30;
const POOL_W          = 12;
const ICON_SIZE       = 65;
const FILTER_SIZE     = 40;
const FILTER_OFFSET   = 10;

var   canvas, grid, active, dragged, placing, closest, synergies, activeTraits;
// Arrays
var   data, races, classes, tiers, champions, maskPoints, mask, traitMask;
var   class_img, race_img;

/********************* p5 Methods ********************/

function preload() { 

	data = loadJSON('data.json'); 
	
}

function setup() {
	
	// Cannot be too high otherwise variable masked in drawGrid() doesn't have the time to be initialized by get(), I guess it's asynchronous or something. Lucky for us we don't *need* a huge framerate for this kek
	frameRate(5);
	
	// Canvas
	canvas = createCanvas(CANVAS_W, CANVAS_H);
	canvas.style('display', 'block');
	
	// Various arrays
	activeTraits = { "race": -1, "class": -1} ;
	grid         = Array((GRID_H * GRID_W - (GRID_H / 2))).fill(0);
	dragged      = 0;
	placing      = { "state": false, "source": -1 };
	synergies    = [];
	loadData();
	
	// Font
	textFont('Helvetica');
	textSize(12);
	
	// Semi-constants
	TILE_H = hexHeight(TILE_W);
	
}

function draw() {
	
	clear();
	
	drawGrid();
	drawSynergies();
	drawPool(POOL_W);
	drawFilters();
	
}

/********************* Initialize ********************/

function loadData() {
      
	// Data
	races     = data['races'];
	classes   = data['classes'];
	tiers     = data['tiers'];
	ch_       = data['champions'];
  
	// Images
	champions = [];
	active    = [];
	var c;
	for (var i in ch_) {
		c = ch_[i];
		if (c.unused)
			continue;
		champions.push(new Champion(c.id, c.name, c.tier, c.race, c['class'], c.crop.x, c.crop.y, c.crop.s));
		active.push(c.id);
	}
	
	class_img = [];
	for (var c in classes)
		class_img.push(loadImage("img/traits/" + classes[c].name.toLowerCase() + ".png"));
	
	race_img = [];
	for (var r in races)
		race_img.push(loadImage("img/traits/" + races[r].name.toLowerCase() + ".png"));
	
	// Masks
	mask      = loadImage("img/hexMask.png");
	traitMask = loadImage("img/traits/traitMask.png");
	
	// Alpha on colors
	for (var t in tiers) {
		var c = color(tiers[t].color);
		c.setAlpha(120);
		tiers[t].color = c;
	}
	
}

/********************** Display **********************/

function drawHexagon(row, col, c) {
	
	// Start on topmost corner  
	var p = computeHexCoords(row, col);
	var x = p.x;
	var y = p.y;

	// Generate 6 Points
	var pts = computeHexPoints(x, y);

	// Background if defined
	if (c === undefined)
		noFill();
	else
		fill(c);
	
	// Draw
	beginShape();
	for (var i = 0; i < pts.length; i++)
		vertex(pts[i].x, pts[i].y);
	endShape(CLOSE);
  
}

function drawGrid() {
  
	noFill();
	stroke(0);
	strokeWeight(1);
	textAlign(CENTER, CENTER);

	var jj;
	var cnt = 0;
	var coords, index;
	for (var i = 0; i < GRID_H; i++) {
		
		// Even rows start at 0, odd ones at 1
		jj = ((i % 2) == 0) ? 1 : 0;
		for (var j = jj; j < GRID_W; j++) {
			
			// If a champion is present
			if (grid[cnt].id > 0) {
			
				// Color background
				drawHexagon(i, j, tiers[grid[cnt].tier - 1].color);
			
				var img    = grid[cnt].img;
				var s      = grid[cnt].subsection;
				
				// Crop and mask
				var masked = img.get(s.p.x, s.p.y, s.s, s.s);
				masked.mask(mask);
				// Display
				coords = computeHexCoords(i, j);
				image(masked, coords.x - TILE_W / 2 - TILE_OFFSET, coords.y, TILE_H, TILE_H);
			}
			else
				drawHexagon(i, j);
			
			cnt++;
		}
	}
  
}

function drawPool(w) {
	
	textAlign(CENTER, BOTTOM);
	strokeWeight(2);
	textSize(12);
	
	var offset   = getPoolOffset(w),
	    x        = 0,
		y        = 0,
		full     = (active.length == champions.length),
		included = false,
		c;
	
	for (var i in champions) {
	  
		// Do not display unused champions
		if (champions[i].unused)
			continue;
	  
		textStyle(NORMAL);
		included = (active.includes(champions[i].id));
		// Color according to champion's tier
		stroke(tiers[champions[i].tier - 1].color);
		
		// Display all or only active champions depending on filters
		if (full || ((!full) && included)) {
			
			fill(tiers[champions[i].tier - 1].color);
			
			rect(offset.x + x * (ICON_SIZE + TILE_OFFSET), offset.y + y * (ICON_SIZE + TILE_OFFSET), ICON_SIZE, ICON_SIZE);
			image(champions[i].img, 
				  offset.x + x * (ICON_SIZE + TILE_OFFSET), offset.y + y * (ICON_SIZE + TILE_OFFSET), // Position in canvas
				  ICON_SIZE, ICON_SIZE,																  // Destination dimensions
				  champions[i].subsection.p.x, champions[i].subsection.p.y,							  // Subsection coordinates
				  champions[i].subsection.s, champions[i].subsection.s);							  // Subsection dimensions

			fill(255);
			textStyle(BOLD);
			text(champions[i].name, offset.x + x * (ICON_SIZE + TILE_OFFSET), offset.y + (y + 0.5) * ICON_SIZE + y * TILE_OFFSET, ICON_SIZE, ICON_SIZE * 0.5);
			
			if (++x >= w) {
			  x = 0;
			  y++;
			}		
		}
	}  
}

function drawSynergies() {
	
	textAlign(LEFT, CENTER);
	textStyle(NORMAL);
	textSize(25);
	fill(color("#F5D64C"));
	
	var offset = new Point(3 * FILTER_SIZE, 5);
	var x_     = computeHexCoords(0,3).x + FILTER_SIZE,
		y_;
	
	if (synergies.length != 0) {
		
		var cnt = 0;
		for (var c in classes)
			if (synergies.classes[c] > 0) {
				y_ = GRID_TOP_OFFSET + cnt * (FILTER_SIZE + offset.y);
				image(class_img[c], x_, y_, FILTER_SIZE, FILTER_SIZE); 
				text(synergies.classes[c], x_ + 1.5 * FILTER_SIZE, y_ + 0.5 * FILTER_SIZE);
				cnt++;
			}
			
		cnt = 0;
		for (var r in races)
			if (synergies.races[r] > 0) {
				y_ = GRID_TOP_OFFSET + cnt * (FILTER_SIZE + offset.y);
				image(race_img[r], x_ + offset.x, y_, FILTER_SIZE, FILTER_SIZE); 
				text(synergies.races[r], x_ + 1.5 * FILTER_SIZE + offset.x, y_ + 0.5 * FILTER_SIZE);
				cnt++
			}

	}
}

function drawFilters() {
	
	var offset = getPoolOffset(POOL_W);
	var x_ = offset.x;
	var y_ = offset.y - 1.4 * FILTER_SIZE;
	
	for (var r in races) {
		image(race_img[r], x_ + r * (FILTER_SIZE + FILTER_OFFSET), y_, FILTER_SIZE, FILTER_SIZE);
		if (activeTraits['race'] == r)
			image(traitMask, x_ + r * (FILTER_SIZE + FILTER_OFFSET), y_, FILTER_SIZE, FILTER_SIZE);
	}
	
	x_ += (POOL_W * (ICON_SIZE + TILE_OFFSET)) - TILE_OFFSET - FILTER_SIZE;
	for (var c in classes) {
		image(class_img[c], x_ - c * (FILTER_SIZE + FILTER_OFFSET), y_, FILTER_SIZE, FILTER_SIZE);
		if (activeTraits['class'] == c)
			image(traitMask, x_ - c * (FILTER_SIZE + FILTER_OFFSET), y_, FILTER_SIZE, FILTER_SIZE);
	}
	
}

/****************** Mouse methods ********************/

function mouseOverGrid() {
	
	return -1;
	
}

function mouseOverTrait() {
	
	var offset = getPoolOffset(POOL_W);
	var x_ = offset.x;
	var y_ = offset.y - 1.4 * FILTER_SIZE;
	
	// From the left rightwards
	for (var r in races) {
		var x = x_ + r * (FILTER_SIZE + FILTER_OFFSET);
		if ((mouseX >= x) && (mouseX <= (x + FILTER_SIZE)) && (mouseY >= y_) && (mouseY <= (y_ + FILTER_SIZE)))
			return { "trait": "race", "index": r };
	}
	
	// From the right leftwards
	x_ += (POOL_W * (ICON_SIZE + TILE_OFFSET)) - TILE_OFFSET - FILTER_SIZE;
	for (var c in classes) {
		var x = x_ - c * (FILTER_SIZE + FILTER_OFFSET);
		if ((mouseX >= x) && (mouseX <= (x + FILTER_SIZE)) && (mouseY >= y_) && (mouseY <= (y_ + FILTER_SIZE)))
			return { "trait": "class", "index": c };
	}
	
	return { "index": -1 };
}

function mouseOverChampion() {
	
	var offset = getPoolOffset(POOL_W),
		x = 0,
		y = 0,
		x_, y_;
				
	for (var i in active) {
		
		// Compare to the rectangle drawn for each champion in drawPool()
		x_ = offset.x + x * (ICON_SIZE + TILE_OFFSET);
		y_ = offset.y + y * (ICON_SIZE + TILE_OFFSET);
		
		if ((mouseX >= x_) && (mouseX <= (x_ + ICON_SIZE)) && (mouseY >= y_) && (mouseY <= (y_ + ICON_SIZE)))
			return active[i];
		
		if (++x >= POOL_W) {
		  x = 0;
		  y++;
		}
		
	}
	
	return -1;
}

function mouseDragged() {
	
	closest = findClosest();
	
}

function mouseReleased() {

	if (closest > -1) {
		
		if (placing.state) {
			
			// If champion present at destination, swap with dragged one
			var tmp = grid[closest];
			grid[closest] = dragged;
			grid[placing.source] = tmp;
			
			// Reset flags
			closest        = -1;
			dragged        = 0;
			placing.state  = false;
			placing.source = -1;
			
			return;
		}
		
		// Check if the champion is not already in the grid
		var includes = false;
		for (var i in grid)
			if (grid[i].id == dragged.id) {
				includes = true;
				break;
			}
		
		// If not, clone Champion object
		if (!includes) {
			grid[closest] = dragged.clone();
			closest       = -1;
			dragged       = 0;
			synergies     = computeSynergies();
		}
	}

}

function mousePressed() {
	
	// Select
	if (mouseButton === LEFT) {
		
		// Champion in pool (if active)
		var c  = mouseOverChampion(),
			ch = champions[getChampionIndex(c)];
		if ((c > -1) && (active.includes(ch.id)))
			dragged = ch;
		
		// Champion in grid (if present)
		var g  = findClosest();
		if (g > -1) {
			dragged = grid[g];
			placing.state  = true;
			placing.source = g;
		}
		
		// Race / class
		var t = mouseOverTrait();
		if (t.index > -1) {
			if (activeTraits[t.trait] == t.index)
				activeTraits[t.trait] = -1;
			else
				activeTraits[t.trait] = t.index;
			fillActive(activeTraits);
		}
	}
	
	// Remove champion from grid
	if (mouseButton === RIGHT) {
		var closest = findClosest();
		if (closest > -1) {
			grid[closest] = 0;
			synergies = computeSynergies();
		}
	}
}

/*********************** Array ***********************/

function getChampionIndex(id) {
	
	for (i in champions)
		if (champions[i].id == id)
			return i;
	return -1;
	
}

function fillActive(activeTraits) {
	
	active = [];
	var c;

	// No active traits --> All champions active
	if ((activeTraits['race'] == -1) && (activeTraits['class'] == -1)) {
		for (c in champions)
			active.push(champions[c].id);
		return;
	}
	
	// Two active traits --> Combined condition
	if ((activeTraits['race'] > -1) && (activeTraits['class'] > -1)) {
		for (c in champions)
			if ((champions[c].race == (parseInt(activeTraits['race']) + 1)) && (champions[c].clas == (parseInt(activeTraits['class']) + 1)))
				active.push(champions[c].id);
		return;
	}
	
	// One active trait --> Any condition
	for (c in champions)
		if ((champions[c].race == (parseInt(activeTraits['race']) + 1)) || (champions[c].clas == (parseInt(activeTraits['class']) + 1)))
			active.push(champions[c].id);
	
}

/*********************** Misc. ***********************/

function hexHeight (width) { return 4 * (width / 2 / sqrt(3)); }

function computeHexCoords(row, col) {
	
	var x = 0 + CANVAS_W/2 - (GRID_W * TILE_W + (GRID_W-1) * TILE_OFFSET)/2;
	var y = GRID_TOP_OFFSET;

	// Rows offset
	y += row * ((TILE_H * 0.75) + TILE_OFFSET);
	// Column offset (odd -> move right half a hex more)
	x += col * (TILE_W + TILE_OFFSET);
	if ((row % 2) == 1) x += (TILE_W + TILE_OFFSET) / 2;
	
	return new Point(x,y);
	
}

function computeHexPoints(x, y) {
	
	return [
		new Point(x,y),
		new Point(x + TILE_W / 2, y + TILE_H * 0.25),
		new Point(x + TILE_W / 2, y + TILE_H * 0.75),
		new Point(x, y + TILE_H),
		new Point(x - TILE_W / 2, y + TILE_H * 0.75),
		new Point(x - TILE_W / 2, y + TILE_H * 0.25)
	];

}

function findClosest() {
	
	var c   = -1,
		d   = TILE_W, d_,
		cnt = 0,
		jj,
		coords, 
		center;
	
	for (var i = 0; i < GRID_H; i++) {
		
		jj = ((i % 2) == 0) ? 1 : 0;
		for (var j = jj; j < GRID_W; j++) {
			
			// Compute distance
			coords = computeHexCoords(i, j);
			center = new Point(coords.x, coords.y + TILE_H / 2);
			d_     = dist(mouseX, mouseY, center.x, center.y);
			
			// Update if closer
			if (d_ < d) {
				d = d_;
				c = cnt;
			}
			cnt++;
			
		}
	}
	
	return c;	
}

function computeSynergies() {
	
	var rcs = Array(races.length).fill(0);
	var cls = Array(classes.length).fill(0);
	var index;
	
	for (var i = 0; i < grid.length; i++)
		if (grid[i].id > 0) {
			index = getChampionIndex(grid[i].id);
			rcs[champions[index].race-1]++;
			cls[champions[index].clas-1]++;
		}
	
	return { 'races': rcs, 'classes': cls };
	
}

function getPoolOffset(w) {
	
	return { x: CANVAS_W / 2 - (w * (ICON_SIZE + TILE_OFFSET)) / 2,
			 y: GRID_TOP_OFFSET + GRID_H * hexHeight(TILE_W) + 3 * FILTER_SIZE};
	
}