const rand = require('random-seed').create();

const THREE = require('three');

const hash = (x, y) => {
	return x * 1000 + y;
};

class Step {

	constructor(x, y) {
		this.x = x;
		this.y = y;
		this.neighbors = [];
	}

	equals(other) {
		return this.x === other.x && this.y === other.y;
	}

	isNeighbor(other) {
		
		const dx = Math.abs(this.x - other.x); // want 0 or 1
		const dy = Math.abs(this.y - other.y); // want 0 or 1
		if (dx > 1 || dy > 1) return false;

		return !this.equals(other);
	}

	addNeighbor(other) {
		this.neighbors.push(other);
	}

	getNeighbors() {
		return this.neighbors;
	}
}

class Walker {

	constructor() {
		this.steps = {};
		this.x = 0;
		this.y = 0;
	}

	move() {

		let x = rand.intBetween(-1, 1);
		let y = rand.intBetween(-1, 1);

		// can't not move
		if (x === 0 && y === 0) return this.move();

		// no diagonals
		const flip = rand.intBetween(0, 1);
		if (flip === 0) {
			if (x !== 0) y = 0;
		} else {
			if (y !== 0) x = 0;
		}

		return { x, y };
	}

	addStep(step) {

		// look for neighbors
		this.getSteps().forEach(s => {
			if (s.isNeighbor(step)) {
				s.addNeighbor(step);
				step.addNeighbor(s);
			}
		});

		// hash and add to steps array
		this.steps[hash(step.x, step.y)] = step;
	}

	step(n, i = 0) {

		if (i === n) return;

		if (i === 0) {
			this.steps[hash(0, 0)] = new Step(0, 0); // always initialize at 0,0
			return this.step(n, 1);
		}
		
		const m = this.move();

		const s = new Step(this.x + m.x, this.y + m.y);

		for (let j = 0; j < this.getSteps().length; j++) {
			if (this.getSteps()[j].equals(s)) return this.step(n, i); // try again
		}

		this.addStep(s);

		// update position
		this.x += m.x;
		this.y += m.y;

		return this.step(n, i + 1);
	}

	hasStep(x, y) {
		return hash(x, y) in this.steps;
	}

	getStart() {
		return this.steps[0] || null;
	}

	getSteps() { return Object.values(this.steps); }
}

export default class HouseMaker {
	
	constructor(seed) {

		this.seed = seed;
		
		this.size = 3;

		this.unitX = 15;
		this.unitY = 10;
		this.unitZ = 6;
		this.roofHeight = 4;

		rand.seed(this.seed);
	}

	set(key, value) {
		if (this.hasOwnProperty(key)) {
			this[key] = value;
		} else {
			throw new Error('Setting unknown key.');
		}
	}

	// returns a mesh ready to be place in scene
	make() {

		console.log('making house w seed', this.seed)

		rand.seed(this.seed);

		const w = new Walker();
		w.step(this.size);

		const group = new THREE.Group();
		const material = new THREE.MeshLambertMaterial({ color: 0xffffff });
		const roofMaterial = new THREE.MeshLambertMaterial({ color: 0x555555 });

		w.getSteps().forEach((step, i) => {

			let x0 = step.x * this.unitX + this.unitX / 2;
			let x1 = x0 - this.unitX;
			let xmid = (x0 + x1) / 2;
			let y0 = step.y * this.unitY + this.unitY / 2;
			let y1 = y0 - this.unitY;
			let ymid = (y0 + y1) / 2;
			let z0 = this.unitZ;
			let z1 = z0 + this.roofHeight;

			const unit = new THREE.Shape();
			
			unit.moveTo(x0, y0, 0);
			unit.lineTo(x1, y0, 0);
			unit.lineTo(x1, y1, 0);
			unit.lineTo(x0, y1, 0);
			unit.lineTo(x0, y0, 0); // close it off

			const extrudeSettings = {
				steps: 4,
				amount: this.unitZ,
				bevelEnabled: false
			};

			const geometry = new THREE.ExtrudeGeometry(unit, extrudeSettings);
			const mesh = new THREE.Mesh(geometry, material);
			group.add(mesh);

			const roofGeo = new THREE.Geometry();

			// TODO: roof overhang?
			x0 += 1;
			y0 += 1;
			x1 -= 1;
			y1 -= 1;

			roofGeo.vertices.push(
				new THREE.Vector3( x0, y0, z0 ),
				new THREE.Vector3( xmid, y0, z0 ),
				new THREE.Vector3( x1, y0, z0 ),
				new THREE.Vector3( x1, ymid, z0 ),

				new THREE.Vector3( x1, y1, z0 ),
				new THREE.Vector3( xmid, y1, z0 ),
				new THREE.Vector3( x0, y1, z0 ),
				new THREE.Vector3( x0, ymid, z0 ),

				new THREE.Vector3( x0, y0, z1 ),
				new THREE.Vector3( xmid, y0, z1 ),
				new THREE.Vector3( x1, y0, z1 ),
				new THREE.Vector3( x1, ymid, z1 ),

				new THREE.Vector3( x1, y1, z1 ),
				new THREE.Vector3( xmid, y1, z1 ),
				new THREE.Vector3( x0, y1, z1 ),
				new THREE.Vector3( x0, ymid, z1 ),
				new THREE.Vector3( xmid, ymid, z1 ),
			);

			roofGeo.faces.push( new THREE.Face3( 0, 2, 16 ) );
			roofGeo.faces.push( new THREE.Face3( 2, 4, 16 ) );
			roofGeo.faces.push( new THREE.Face3( 4, 6, 16 ) );
			roofGeo.faces.push( new THREE.Face3( 6, 0, 16 ) );

			// roof depends on neighbors
			step.getNeighbors().forEach(neighbor => {
					
				const dx = neighbor.x - step.x;
				const dy = neighbor.y - step.y;

				// ignore diagonal FOR NOW (TODO)
				if (dx & dy !== 0) return;

				let a = 0, b = 0, c = 0, d = 0, e = 16, f = 0;

				let front;
				let rear;
				let l1, l2;
				let r1, r2;

				if (dx === -1) {
					a = 2;
					b = 11;
					c = 4;
					d = 1;
					f = 5;
				} else if (dx === 1) {
					a = 6;
					b = 15;
					c = 0;
					d = 5;
					f = 1;
				} else if (dy === 1) {
					a = 0;
					b = 9;
					c = 2;
					d = 7;
					f = 3;
				} else if (dy === -1) {
					a = 4;
					b = 13;
					c = 6;
					d = 3;
					f = 7;
				}
				
				front = new THREE.Face3(a, c, b);
				rear = new THREE.Face3(d, e, f);
				l1 = new THREE.Face3(d, a, b);
				l2 = new THREE.Face3(e, d, b);
				r1 = new THREE.Face3(c, f, e);
				r2 = new THREE.Face3(b, c, e);

				roofGeo.faces.push( front );
				roofGeo.faces.push( rear );
				roofGeo.faces.push( l1 );
				roofGeo.faces.push( l2 );
				roofGeo.faces.push( r1 );
				roofGeo.faces.push( r2 );
			});

			roofGeo.computeFaceNormals();

			const roofMesh = new THREE.Mesh(roofGeo, roofMaterial);
			group.add(roofMesh);

		});

		return group;
	}
};