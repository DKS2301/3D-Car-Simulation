import { useEffect } from 'react';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import SceneInit from './lib/SceneInit';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import './App.css';
import SpeedometerDisplay from './Speedometer';
function App() {
  let speed = 0;
  let isEngineOn=false;
  let headlights = [];
  let maxTilt = 8; 

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

    //Set the ground texture
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
      test.scene.environmentIntensity = 0.2; 
      test.scene.environment = texture;  
      test.scene.background = texture;  
    });


    // Car setup
    const vehicle = new CANNON.RigidVehicle({
      chassisBody: new CANNON.Body({
        mass: 100,
        position: new CANNON.Vec3(0, 6, 0),
        shape: new CANNON.Box(new CANNON.Vec3(1.75, 0.5, 4)),
      }),
    });
    physicsWorld.addBody(vehicle.chassisBody);
    var chassisModel=null
    const loader = new GLTFLoader();
    loader.load('/car-body/cybertruck.glb', (gltf) => {
      chassisModel = gltf.scene;      
      chassisModel.scale.set(3.5, 3.5, 3.5); 
      chassisModel.position.set(0, 0, 0);
      
      chassisModel.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      
      test.scene.add(chassisModel);
      test.carModel=chassisModel;
      
      const createHeadlight = (x, y, z) => {
        const light = new THREE.SpotLight(0xffffff, 0, 20, Math.PI / 6, 0.3, 0.5);
        light.position.set(x, y, z);
        light.castShadow = true;
        const lightTarget = new THREE.Object3D();
        lightTarget.position.set(x, y - 1, z + 15);
        light.target = lightTarget;
        chassisModel.add(light);  
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
    const wheelShape = new CANNON.Cylinder(wheelRadius, wheelRadius, 0.5, 20);
    const wheelMaterial = new CANNON.Material('wheel');
    const down = new CANNON.Vec3(0, -1, 0);
    const wheelQuaternion = new CANNON.Quaternion();
    wheelQuaternion.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), Math.PI / 2);


    const wheelModels = [];
    const wheelBodies = []; // Store physics wheel bodies
    function createWheel(position, isSteeringWheel = false) {
      const wheelBody = new CANNON.Body({ mass: 5, material: wheelMaterial });
      wheelBody.addShape(wheelShape, new CANNON.Vec3(0, 0, 0), wheelQuaternion);
      wheelBody.angularDamping = 0.9;
    
      vehicle.addWheel({
        body: wheelBody,
        position,
        axis: new CANNON.Vec3(1, 0, 0),
        direction: down,
        suspensionStiffness: 250,
        suspensionRestLength: 0.8,
        frictionSlip: 2,
        dampingRelaxation: 2.3,
        dampingCompression: 4.4,
        maxSuspensionForce: 1000,
        isFrontWheel: isSteeringWheel,
      });
      wheelBodies.push(wheelBody);

      loader.load('/car-body/wheel.gltf', (gltf) => {
        const wheelModel = gltf.scene;
    
        wheelModel.scale.set(3.5, 3.5, 3.5);
        wheelModel.position.copy(position);

        //Mirror wheels on the right side
        if (position.x < 0) {
          wheelModel.scale.x *= -1;
        }
        wheelModel.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
    
        test.scene.add(wheelModel);
        wheelModels.push({ model: wheelModel, body: wheelBody });
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
let turboActive=false;
document.addEventListener('keydown', (event) => {
  switch (event.key) {
    case 'e': 
      isEngineOn = !isEngineOn;
      document.getElementById('engine-status').textContent = isEngineOn ? 'ON' : 'OFF';
      document.getElementById('engine-status').style.color = isEngineOn ? 'green' : 'red';

      if (isEngineOn) {
        headlights.forEach(light => (light.intensity = 20));
        vehicle.chassisBody.applyForce(new CANNON.Vec3(150, 0, 0), vehicle.chassisBody.position);
        vehicle.chassisBody.velocity.set(0, 0, 0);
        if (test.engineStartSound && !test.engineStartSound.isPlaying) {
          test.engineStartSound.play();
        }
      } 
      else {
        headlights.forEach(light => (light.intensity = 0));
        vehicle.setWheelForce(0, 2);
        vehicle.setWheelForce(0, 3);
      }
      break;
      
      case 'w':
        case 'ArrowUp':
          if (isEngineOn) {
            vehicle.chassisBody.linearDamping = 0.3;
            accelerationForce = 400;
            vehicle.setWheelForce(accelerationForce, 2);
            if (test.engineRaceSound && !test.engineRaceSound.isPlaying) {
              test.engineRaceSound.play();
            }
            vehicle.setWheelForce(accelerationForce, 3);
        }
      break;
      
      case 's':
      case 'ArrowDown':
        if (isEngineOn) {
          vehicle.chassisBody.linearDamping = 0.3;
          accelerationForce = -300;
          vehicle.setWheelForce(accelerationForce, 2);
          if (test.engineRaceSound && !test.engineRaceSound.isPlaying) {
            test.engineRaceSound.play();
          }
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
      vehicle.setWheelForce(0, 0); // Front-left wheel
      vehicle.setWheelForce(0, 1); // Front-right wheel
      vehicle.setWheelForce(0, 2); // Rear-left wheel
      vehicle.setWheelForce(0, 3); // Rear-right wheel

      const weightFactor = 1.5; 
      const maxSkidForce = 100; 
      
      const brakeFactor = Math.max(0.7, 1 - speed * 0.02); 
      const tiltFactor = Math.min(speed * 0.08 * weightFactor, maxTilt); 
      
      const skidFactor = speed > 40 ? (Math.random() * 0.2 - 0.1) * (speed / 100) : 0;
      
      vehicle.chassisBody.applyImpulse(
          new CANNON.Vec3(0, tiltFactor * 12, -tiltFactor * 3), 
          vehicle.chassisBody.position
      );
      
      if (speed > 30 && Math.abs(vehicle.chassisBody.velocity.x) > 2) {

          test.SkidSound.play();
          vehicle.chassisBody.applyImpulse(
              new CANNON.Vec3(skidFactor * maxSkidForce, 0, skidFactor * maxSkidForce),
              vehicle.chassisBody.position
          );
      }
      else if(speed > 2){
        test.engineBrakeSound.play();
      }
      
      vehicle.chassisBody.velocity.x *= brakeFactor;  
      vehicle.chassisBody.velocity.z *= brakeFactor;
      
      vehicle.chassisBody.angularVelocity.set(tiltFactor * 0.6, 0, 0); 
      
      vehicle.chassisBody.linearDamping = Math.min(0.99, 0.8 + speed * 0.005);  
      
      break;

    case 'Shift': // TURBO MODE
      turboActive = true;
      headlights.forEach(light => (light.intensity = 50)); 
      setTimeout(() => {
          turboActive = false;
          headlights.forEach(light => (light.intensity = 20));
      }, 6000); 
      break;
      
  }
});

document.addEventListener('keyup', (event) => {
  if (['w', 's', 'ArrowUp', 'ArrowDown',' '].includes(event.key)) {
    accelerationForce = 0;
    test.engineRaceSound.stop();
    vehicle.setWheelForce(0, 2);
    vehicle.setWheelForce(0, 3);
    vehicle.setSteeringValue(0, 0);
    vehicle.setSteeringValue(0, 1);
  }
  else if (['a', 'd', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
    steeringAngle = 0;
    vehicle.setSteeringValue(0, 0);
    vehicle.setSteeringValue(0, 1);
  }
});

// Animation Loop
const animate = () => {
  physicsWorld.fixedStep();

  if (chassisModel) {
    chassisModel.position.copy(vehicle.chassisBody.position);
    chassisModel.quaternion.copy(vehicle.chassisBody.quaternion);
  }
  if(wheelModels.length>0){
    for (let i = 0; i < wheelModels.length; i++) {
      const wheelBody = wheelModels[i].body;
      const wheelModel = wheelModels[i].model; 
  
      if (wheelModel) {
        // Sync wheel position
        wheelModel.position.copy(wheelBody.position);
        wheelModel.quaternion.copy(wheelBody.quaternion);
        const wheelSpinSpeed = speed * 0.05; 
        const spinQuaternion = new THREE.Quaternion();
        spinQuaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -wheelSpinSpeed); 
        wheelModel.quaternion.multiplyQuaternions(wheelModel.quaternion, spinQuaternion);
        
      }
    }
  }
  //Engine vibration
  if (isEngineOn) {
    vibrationTime += 0.02;

    const vibrationStrength = 0.0015 ; 
    const shakeY = Math.sin(vibrationTime * 10) * vibrationStrength; 
    const shakeX = Math.sin(vibrationTime * 8) * (vibrationStrength / 2); 
    
    chassisModel.position.y += shakeY; 
    chassisModel.position.x += shakeX; 
    
    chassisModel.rotation.z += Math.sin(vibrationTime * 12) * 0.002;
  }
  
  const velocity = vehicle.chassisBody.velocity;
  speed = Math.sqrt(velocity.x ** 2 + velocity.z ** 2) * 3.6;
  document.getElementById('speedometer').textContent = `Speed: ${speed.toFixed(1)} km/h`;
  
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
    <SpeedometerDisplay speed={speed}/>
    </div>
    
    {/* Control Sidebar */}
    <div id="control-sidebar">
      <h2>CONTROLS</h2>
      <p><b>Engine:</b> <span id="engine-status">OFF
      </span></p>
        <p><b>E</b> - Toggle Engine</p>
        <p><b>W / S</b> - Forward / Reverse</p>
        <p><b>A / D</b> - Turn Left / Right</p>
        <p><b>Space</b> - Brake</p>
    </div>
  </div>
);
}

export default App;
