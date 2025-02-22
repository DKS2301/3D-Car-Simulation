import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import Stats from 'three/examples/jsm/libs/stats.module';

export default class SceneInit {
  constructor(canvasId) {
    this.scene = undefined;
    this.camera = undefined;
    this.renderer = undefined;
    this.freecamera=true;

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
      
      const initialCameraOffset = new THREE.Vector3(-10, 10, -20); // (Height, distance behind)
      const carPosition = this.carModel.position.clone();

      let currentOffset = this.camera.position.clone().sub(carPosition);
      let newCameraPosition = carPosition.clone();
      
      newCameraPosition.x += currentOffset.x; // Keep X from OrbitControls
      newCameraPosition.y += currentOffset.y; // Keep Y from OrbitControls
      newCameraPosition.z += initialCameraOffset.z; 
      this.camera.position.lerp(newCameraPosition, 0.01);

      // Make the camera look slightly ahead of the car
      const lookAheadOffset = new THREE.Vector3(0, 2, 5); // Look slightly ahead
      const lookAtTarget = carPosition.clone().add(
          lookAheadOffset.applyQuaternion(this.carModel.quaternion)
      );
      this.camera.lookAt(lookAtTarget);

      // Prevent camera from going too far or too close
      if (isNaN(this.camera.position.x) || isNaN(this.camera.position.y) || isNaN(this.camera.position.z)) {
          console.warn("Invalid camera position detected! Resetting...");
          this.camera.position.set(carPosition.x, carPosition.y + 5, carPosition.z + 10); // Reset position
      }
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