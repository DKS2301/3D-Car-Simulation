import { useEffect } from 'react';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import CannonDebugger from 'cannon-es-debugger';
import SceneInit from './lib/SceneInit';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import './App.css';
function App() {
  let speed = 0;
  let isEngineOn=false;
  let headlights = [];
  useEffect(() => {
    const test = new SceneInit('myThreeJsCanvas');
    test.initialize();
    test.animate();
    const physicsWorld = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
    const groundMaterial = new CANNON.Material('ground');
    const groundBody = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Plane(),
      material: groundMaterial
    });
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    physicsWorld.addBody(groundBody);
    const textureLoader = new THREE.TextureLoader();
    const rockyTexture = textureLoader.load('/textures/rocky_ground.jpg');

    test.renderer.toneMappingExposure = 0.5; // Reduce scene brightness

    rockyTexture.wrapS = THREE.RepeatWrapping;
    rockyTexture.wrapT = THREE.RepeatWrapping;
    rockyTexture.repeat.set(50, 50); 

    //Set teh ground texture
    const groundMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(500, 500),
      new THREE.MeshStandardMaterial({
        map: rockyTexture,
      })
    );
    groundMesh.rotation.x = -Math.PI / 2;
    test.scene.add(groundMesh);

    // Set the sky
    const hdrLoader = new RGBELoader();
    hdrLoader.load('sky/sky.hdr', (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      test.scene.environmentIntensity = 0.2; // Reduce HDR brightness
      test.scene.environment = texture;  
      test.scene.background = texture;  
    });

    const cannonDebugger = new CannonDebugger(test.scene, physicsWorld, {
      color: 0x0c0c0c  , 
    });

    // Car setup
    const vehicle = new CANNON.RigidVehicle({
      chassisBody: new CANNON.Body({
        mass: 150,
        position: new CANNON.Vec3(0, 6, 0),
        shape: new CANNON.Box(new CANNON.Vec3(1.75, 0.5, 4)),
      }),
    });
    physicsWorld.addBody(vehicle.chassisBody);
    var chassisModel=null
    const loader = new GLTFLoader();
    loader.load('/car-body/cybertruck.glb', (gltf) => {
      chassisModel = gltf.scene;
      console.log("model loaded");
    
      chassisModel.scale.set(3.5, 3.5, 3.5); 
      chassisModel.position.set(0, 0, 0);
    
      chassisModel.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
    
      test.scene.add(chassisModel);

      const createHeadlight = (x, y, z) => {
        const light = new THREE.SpotLight(0xffffff, 0, 20, Math.PI / 6, 0.3, 0.5);
        light.position.set(x, y, z);
        light.castShadow = true;
        const lightTarget = new THREE.Object3D();
        lightTarget.position.set(x, y - 1, z + 15);
        light.target = lightTarget;
        chassisModel.add(light);  // Attach to chassis
        chassisModel.add(lightTarget); 
        return light;
      };

      headlights = [
        createHeadlight(1.0, 0.5, 0.8), // Right headlight
        createHeadlight(-1.0, 0.5, 0.8) // Left headlight
      ];
    });
    
    
    
    // Wheel setup
    const wheelRadius = 0.9;
    const wheelShape = new CANNON.Cylinder(wheelRadius, wheelRadius, 0.5, 80);
    const wheelMaterial = new CANNON.Material('wheel');
    const down = new CANNON.Vec3(0, -1, 0);
    const wheelQuaternion = new CANNON.Quaternion();
    wheelQuaternion.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), Math.PI / 2);



    function createWheel(position, isSteeringWheel = false) {
      // Create the physics wheel
      const wheelBody = new CANNON.Body({ mass: 5, material: wheelMaterial });
      wheelBody.addShape(wheelShape, new CANNON.Vec3(0, 0, 0), wheelQuaternion);
      wheelBody.angularDamping = 0.9;

      vehicle.addWheel({
        body: wheelBody,
        position,
        axis: new CANNON.Vec3(1, 0, 0),
        direction: down,
        suspensionStiffness: 150,
        suspensionRestLength: 0.8,
        frictionSlip: 2,
        dampingRelaxation: 2.3,
        dampingCompression: 4.4,
        maxSuspensionForce: 10000,
        isFrontWheel: isSteeringWheel,
      });

    }

// Create Wheels
createWheel(new CANNON.Vec3(-2, -1, 4.1), true); //Front Right
createWheel(new CANNON.Vec3(2, -1, 4.1), true); //Front Left
createWheel(new CANNON.Vec3(-2, -1, -3.9)); //Back Right
createWheel(new CANNON.Vec3(2, -1, -3.9)); //Back Left

vehicle.addToWorld(physicsWorld);

// Input Handling

let steeringAngle = 0;
let accelerationForce = 0;
let vibrationTime=0;
document.addEventListener('keydown', (event) => {
  switch (event.key) {
    case 'e': 
      isEngineOn = !isEngineOn;
      document.getElementById('engine-status').textContent = isEngineOn ? 'ON' : 'OFF';
      document.getElementById('engine-status').style.color = isEngineOn ? 'green' : 'red';

      if (isEngineOn) {
        console.log("Engine started!");
        headlights.forEach(light => (light.intensity = 20));
        vehicle.chassisBody.applyForce(new CANNON.Vec3(150, 0, 0), vehicle.chassisBody.position);
        vehicle.chassisBody.velocity.set(0, 0, 0);
      } 
      else {
        console.log("Engine stopped!");
        headlights.forEach(light => (light.intensity = 0));
        vehicle.setWheelForce(0, 2);
        vehicle.setWheelForce(0, 3);
      }
      break;

    case 'w':
    case 'ArrowUp':
      if (isEngineOn) {
        accelerationForce = 300;
        vehicle.setWheelForce(accelerationForce, 2);
        vehicle.setWheelForce(accelerationForce, 3);
      }
      break;

    case 's':
    case 'ArrowDown':
      if (isEngineOn) {
        accelerationForce = -150;
        vehicle.setWheelForce(accelerationForce, 2);
        vehicle.setWheelForce(accelerationForce, 3);
      }
      break;

    case 'a':
    case 'ArrowLeft':
      steeringAngle = Math.min(0.5, steeringAngle + 0.05);
      vehicle.setSteeringValue(steeringAngle, 0);
      vehicle.setSteeringValue(steeringAngle, 1);
      break;

    case 'd':
    case 'ArrowRight':
      steeringAngle = Math.max(-0.5, steeringAngle - 0.05);
      vehicle.setSteeringValue(steeringAngle, 0);
      vehicle.setSteeringValue(steeringAngle, 1);
      break;

    case ' ':
      console.log("Brakes applied!");

      // Reduce wheel forces to smoothly stop the car
      vehicle.setWheelForce(0, 0); // Front-left wheel
      vehicle.setWheelForce(0, 1); // Front-right wheel
      vehicle.setWheelForce(0, 2); // Rear-left wheel
      vehicle.setWheelForce(0, 3); // Rear-right wheel
      
      const brakeDamping = 0.0001; 
      vehicle.chassisBody.velocity.scale(brakeDamping);
      break;
      
  }
});

document.addEventListener('keyup', (event) => {
  if (['w', 's', 'ArrowUp', 'ArrowDown',' '].includes(event.key)) {
    accelerationForce = 0;
    vehicle.setWheelForce(0, 2);
    vehicle.setWheelForce(0, 3);
    vehicle.setSteeringValue(0, 0);
    vehicle.setSteeringValue(0, 1);
  }
});

// Animation Loop
const animate = () => {
  physicsWorld.fixedStep();
  cannonDebugger.update();

  if (chassisModel) {
    chassisModel.position.copy(vehicle.chassisBody.position);
    chassisModel.quaternion.copy(vehicle.chassisBody.quaternion);
  }
  //Engine vibration
  if (isEngineOn) {
    vibrationTime += 0.025;

    const vibrationStrength = 0.02 ; 
    const shakeY = Math.sin(vibrationTime * 10) * vibrationStrength; 
    const shakeX = Math.sin(vibrationTime * 8) * (vibrationStrength / 2); 

    chassisModel.position.y += shakeY; 
    chassisModel.position.x += shakeX; 

    chassisModel.rotation.z += Math.sin(vibrationTime * 12) * 0.002;
  }
  const velocity = vehicle.chassisBody.velocity;
  speed = Math.sqrt(velocity.x ** 2 + velocity.z ** 2) * 3.6;
  document.getElementById('speedometer').textContent = `Speed: ${speed.toFixed(2)} km/h`;

  window.requestAnimationFrame(animate);
};

animate();

  }, [isEngineOn]);

  return (
  <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
    {/* Three.js Canvas */}
    <canvas id="myThreeJsCanvas" />

    {/* Speedometer Display */}
    <div id="speedometer">
      Speed: 0 km/h
    </div>

    {/* Control Sidebar */}
    <div id="control-sidebar">
      <h2>CONTROLS</h2>
      <p><b>Engine:</b> <span id="engine-status">OFF
      </span></p>
      <ul>
        <li><b>E</b> - Toggle Engine</li>
        <li><b>W / S</b> - Forward / Reverse</li>
        <li><b>A / D</b> - Turn Left / Right</li>
        <li><b>Space</b> - Brake</li>
      </ul>
    </div>
  </div>
);
}

export default App;
