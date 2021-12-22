class Champion {

	constructor(id, name, tier, race, clas, sub_x, sub_y, s) {
		this.id         = id;
		this.name       = name;
		this.tier       = tier;
		this.race       = race;
		this.clas       = clas;
		this.img        = loadImage("img/" + name.toLowerCase() + ".webp");
		this.subsection = { "p": new Point(sub_x, sub_y), "s": s };
	}
	
	clone = function() {
		return new Champion(this.id,
							this.name,
							this.tier,
							this.race,
							this.clas,
							this.subsection.p.x, this.subsection.p.y, this.subsection.s);
	}

}