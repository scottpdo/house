import React, { Component } from 'react';
import _ from 'lodash';
import zfill from 'zfill';

import HouseMaker from './HouseMaker';

import {
	X_AXIS, Y_AXIS, Z_AXIS, ORIGIN
} from './constants';

import './UI.css';

const seed = window.location.hash ? +window.location.hash.replace(/[^0-9]+/g, '') : 1;
window.location.hash = zfill(seed, 3);

const THREE = require('three');
const OrbitControls = require('three-orbit-controls')(THREE);

export default class CanvasView extends Component {
	
	constructor() {

		super();

		this.state = {
			i: 0,
			size: 6,
			unitX: 15,
			unitY: 10,
			seed
		};

		this.houseMaker = new HouseMaker(seed);
		this.houseMaker.set('size', this.state.size);
		this.houseMaker.set('unitX', this.state.unitX);

		this.keys = { LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, SPACE: 32, ESC: 27, ENTER: 13 };
		this.keysDown = [];

		this.iter = this.iter.bind(this);
		this.onResize = _.debounce(this.onResize.bind(this), 250);
		this.onClick = this.onClick.bind(this);
		this.onMouseWheel = this.onMouseWheel.bind(this);
		this.onKeyDown = this.onKeyDown.bind(this);
		this.onKeyUp = this.onKeyUp.bind(this);
		this.draw = this.draw.bind(this);

		this.update = this.update.bind(this);
		this.seed = this.seed.bind(this);
	}

	iter() {
		this.setState({ i: this.state.i + 1 });
	}

	seed(e) {
		window.location.hash = zfill(e.target.value, 3);
		this.update(e);
	}

	update(e) {
		
		const which = e.target.name;
		this.houseMaker.set(which, +e.target.value);
		
		this.scene.remove(this.house);
		this.house = this.houseMaker.make();
		this.scene.add(this.house);
	}

	onResize() {

		const canvas = this.canvas;

		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;

		this.camera.aspect = canvas.width / canvas.height;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize( canvas.width, canvas.height );
		this.renderer.render(this.scene, this.camera);
	}

	onClick(e) {
	}

	onKeyDown(e) {

		const code = e.keyCode;

		Object.values(this.keys).forEach((key) => {
			if (code === key) this.keysDown.push(code);
		});
		
		// remove duplicates
		this.keysDown = _.uniq(this.keysDown);

		// arrow keys
		if (code >= 37 && code <= 40) {
			
			const z = new THREE.Quaternion();
			z.setFromAxisAngle( Z_AXIS, 0.05 );

			const x = new THREE.Quaternion();
			x.setFromAxisAngle( X_AXIS, 0.025 );

			const lookup = { 
				37: z, 
				39: z.clone().inverse(), 
				40: x, 
				38: x.clone().inverse() 
			};

			// this.camera.position.applyQuaternion(lookup[code]);
		}

		// others
	}

	onKeyUp(e) {
		const code = e.keyCode;
		this.keysDown = this.keysDown.filter(key => key !== code);
	}

	onMouseWheel(e) {
	}

	draw() {
		this.renderer.render(this.scene, this.camera);
		window.requestAnimationFrame(this.draw);
	}

	componentDidMount() {

		// set up canvas
		const canvas = this.refs.canvas;
		this.canvas = canvas;

		// set up scene, camera, renderer
		this.scene = new THREE.Scene();
		
		this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 10000);
		this.camera.position.set(60, 60, 60);
		this.camera.up = Z_AXIS;
		this.camera.lookAt(ORIGIN);

		new OrbitControls(this.camera, this.refs.canvas);

		this.renderer = new THREE.WebGLRenderer({
			canvas: this.refs.canvas,
			antialias: true
		});

		this.renderer.setPixelRatio( window.devicePixelRatio );
		this.renderer.setSize( window.innerWidth, window.innerHeight );

		// add objects to scene
		const light = new THREE.DirectionalLight( 0xffffff, 1 );
		light.position.set(0, 80, 100);
		this.scene.add(light);
		const light2 = new THREE.DirectionalLight( 0xffffff, 0.5 );
		light2.position.set(40, 0, 100);
		this.scene.add(light2);
		this.scene.add(new THREE.AmbientLight(0x3f3f3f));

		const groundGeo = new THREE.PlaneGeometry(400, 400);
		const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x666666 });
		const groundPlane = new THREE.Mesh(groundGeo, groundMaterial);
		this.scene.add(groundPlane);

		const zLine = new THREE.Geometry();
		zLine.vertices.push(
			ORIGIN,
			Z_AXIS.clone().multiplyScalar(10000)
		);
		const zMaterial = new THREE.LineBasicMaterial({ color: 0xffff00, linewidth: 1 });
		this.scene.add(new THREE.Line(zLine, zMaterial));

		// make a house!
		this.house = this.houseMaker.make();
		this.scene.add(this.house);
		
		this.onResize();

		window.addEventListener('resize', this.onResize);
		this.refs.canvas.addEventListener('click', this.onClick);
    this.refs.canvas.addEventListener('wheel', this.onMouseWheel);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
		
		this.draw();
	}

	render() {

		return (
			<div>
				<canvas ref="canvas" />
				<div className="UI">
					<input type="range" min="1" max="999" name="seed" defaultValue={this.state.seed} onChange={this.seed} />
					<input type="range" min="1" max="16" name="size" defaultValue={this.state.size} onChange={this.update} />
					<input type="range" min="8" max="20" name="unitX" defaultValue={this.state.unitX} onChange={this.update} />
					<input type="range" min="8" max="20" name="unitY" defaultValue={this.state.unitY} onChange={this.update} />
				</div>
			</div>
		)
	}
};