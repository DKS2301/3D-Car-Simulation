import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import Stats from 'three/examples/jsm/libs/stats.module';

export default class SceneInit {
  constructor(canvasId) {
    this.scene = undefined;
    this.camera = undefined;
    this.renderer = undefined;

    this.fov = 45;
    this.nearPlane = 1;
    this.farPlane = 1000;
    this.canvasId = canvasId;
    this.carModel = null;
    this.clock = undefined;
    this.stats = undefined;
    this.controls = undefined;

    this.ambientLight = undefined;
    this.directionalLight = undefined;
  }

  initialize() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      this.fov,
      window.innerWidth / window.innerHeight,
      1,
      1000
    );
    this.camera.position.z = 24;
    this.camera.position.y = 8;

    const canvas = document.getElementById(this.canvasId);
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);

    this.clock = new THREE.Clock();
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.stats = Stats();
    document.body.appendChild(this.stats.dom);

    // ambient light which is for the whole scene
    this.ambientLight = new THREE.AmbientLight(0x0a0a32, 0.2); 
    this.scene.add(this.ambientLight);
    
    // Directional light (moonlight effect, dimmer)
    this.directionalLight = new THREE.DirectionalLight(0xaaaaee, 0.3); 
    this.directionalLight.position.set(0, 32, 64);
    this.scene.add(this.directionalLight);

    // if window resizes
    window.addEventListener('resize', () => this.onWindowResize(), false);

  }

  //animating
  animate() {
    window.requestAnimationFrame(this.animate.bind(this));
    if (this.carModel) {
      const offset = new THREE.Vector3(0, 5, -10); // Adjust offset (height, distance)
      const carPosition = this.carModel.position.clone();
      const cameraTarget = this.carModel.position.clone();
  
      // Move the camera relative to the car
      const newCameraPosition = carPosition.add(offset.applyQuaternion(this.carModel.quaternion));
      this.camera.position.lerp(newCameraPosition, 0.1); // Smooth transition
  
      // Make the camera look at the car
      this.camera.lookAt(cameraTarget);
    }
    this.render();
    this.stats.update();
    this.controls.update();
  }

  render() {

    this.renderer.render(this.scene, this.camera);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}