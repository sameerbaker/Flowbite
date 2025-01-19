import * as THREE from "https://cdn.skypack.dev/three@0.132.2";
import { TrackballControls } from "https://cdn.skypack.dev/three@0.132.2/examples/jsm/controls/TrackballControls.js";
import { OBJLoader } from "https://cdn.skypack.dev/three@0.132.2/examples/jsm/loaders/OBJLoader.js";
import { MeshSurfaceSampler } from "https://cdn.skypack.dev/three@0.132.2/examples/jsm/math/MeshSurfaceSampler.js";

console.clear();
window.THREE = THREE;

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById("scene-container").appendChild(renderer.domElement);

camera.position.z = 250;
camera.position.y = 100;

// Trackball controls
const controls = new TrackballControls(camera, renderer.domElement);
controls.noPan = true;
controls.maxDistance = 600;
controls.minDistance = 150;
controls.rotateSpeed = 2;

// Group for all objects
const group = new THREE.Group();
scene.add(group);
group.rotation.y = 2;

let subgroups = [];
let airplane = new THREE.Group();
let sampler = [];
let earth = null;
let paths = [];

// Load airplane model
new OBJLoader().load(
  "https://assets.codepen.io/127738/Airplane_model2.obj",
  (obj) => {
    airplane = obj;
    const mat = new THREE.MeshPhongMaterial({
      emissive: 0xffffff,
      emissiveIntensity: 0.3,
    });
    airplane.children.forEach((child) => {
      child.geometry.scale(0.013, 0.013, 0.013);
      child.geometry.translate(0, 122, 0);
      child.material = mat;
    });

    let angles = [0.3, 1.3, 2.14, 2.6];
    let speeds = [0.008, 0.01, 0.014, 0.02];
    let rotations = [0, 2.6, 1.5, 4];
    for (let i = 0; i < 4; i++) {
      const g = new THREE.Group();
      g.speed = speeds[i];
      subgroups.push(g);
      group.add(g);
      const g2 = new THREE.Group();
      let _airplane = airplane.clone();
      g.add(g2);
      g2.add(_airplane);
      g2.rotation.x = rotations[i];
      g.rotation.y = angles[i];
      // Reverse airplane rotation
      g.reverse = i < 2;
      if (i < 2) {
        _airplane.children[0].geometry = airplane.children[0].geometry.clone().rotateY(Math.PI);
      }
    }
  }
);

// Load Earth model
new OBJLoader().load(
  "https://assets.codepen.io/127738/NOVELO_EARTH.obj",
  (obj) => {
    earth = obj.children[0];
    earth.geometry.scale(0.35, 0.35, 0.35);
    earth.geometry.translate(0, -133, 0);

    // Split earth into land and water
    let positions = Array.from(earth.geometry.attributes.position.array).splice(0, 3960 * 3);
    const landGeom = new THREE.BufferGeometry();
    landGeom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    const land = new THREE.Mesh(landGeom);

    positions = Array.from(earth.geometry.attributes.position.array).splice(3960 * 3, 540 * 3);
    const waterGeom = new THREE.BufferGeometry();
    waterGeom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    waterGeom.computeVertexNormals();
    const waterMat = new THREE.MeshLambertMaterial({
      color: 0x0da9c3,
      transparent: true,
      opacity: 1,
    });
    const water = new THREE.Mesh(waterGeom, waterMat);
    group.add(water);

    // Add hemisphere light
    const light = new THREE.HemisphereLight(0xccffff, 0x000033, 1);
    scene.add(light);

    // Initialize sampler for paths
    sampler = new MeshSurfaceSampler(land).build();

    // Create paths
    for (let i = 0; i < 24; i++) {
      const path = new Path();
      paths.push(path);
      group.add(path.line);
    }

    // Start rendering loop
    renderer.setAnimationLoop(render);
  },
  (xhr) => console.log((xhr.loaded / xhr.total) * 100 + "% loaded"),
  (err) => console.error(err)
);

// Path class for airplane paths
const tempPosition = new THREE.Vector3();
const lineMaterial = new THREE.LineBasicMaterial({
  color: 0xbbde2d,
  transparent: true,
  opacity: 0.6,
});
class Path {
  constructor() {
    this.geometry = new THREE.BufferGeometry();
    this.line = new THREE.Line(this.geometry, lineMaterial);
    this.vertices = [];

    sampler.sample(tempPosition);
    this.previousPoint = tempPosition.clone();
  }
  update() {
    let pointFound = false;
    while (!pointFound) {
      sampler.sample(tempPosition);
      if (tempPosition.distanceTo(this.previousPoint) < 12) {
        this.vertices.push(tempPosition.x, tempPosition.y, tempPosition.z);
        this.previousPoint = tempPosition.clone();
        pointFound = true;
      }
    }
    this.geometry.setAttribute("position", new THREE.Float32BufferAttribute(this.vertices, 3));
  }
}

// Render loop
function render(a) {
  // Rotate the whole scene
  group.rotation.y += 0.001;

  // Rotate each plane
  subgroups.forEach((g) => {
    g.children[0].rotation.x += g.speed * (g.reverse ? -1 : 1);
  });

  // Update each path
  paths.forEach((path) => {
    if (path.vertices.length < 35000) {
      path.update();
    }
  });

  controls.update();
  renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener("resize", onWindowResize, false);
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}


