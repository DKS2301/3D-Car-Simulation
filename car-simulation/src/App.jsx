import { useEffect } from 'react';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import CannonDebugger from 'cannon-es-debugger';
import SceneInit from './lib/SceneInit';

function App() {
  useEffect(() => {
    // ============ 
    // part 0
    // set up Three.js scene with axis helper
    // ============ 
    const test = new SceneInit('myThreeJsCanvas');
    test.initialize();
    test.animate();
    const axesHelper = new THREE.AxesHelper(8);
    test.scene.add(axesHelper);

    // ============ 
    // part 1 
    // set up world physics with gravity
    // ============ 
    const physicsWorld = new CANNON.World({
      gravity: new CANNON.Vec3(0, -9.82, 0),
    });

    // create a ground body with a static plane
    const groundBody = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Plane(),
    });
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    physicsWorld.addBody(groundBody);

    // add a green wireframe to each object and visualize the physics world
    const cannonDebugger = new CannonDebugger(test.scene, physicsWorld);

    // ============ 
    // part 2
    // add RigidVehicle for the car (using GLTF model for chassis)
    // ============

    const vehicle = new CANNON.RigidVehicle({
      chassisBody: new CANNON.Body({
        mass: 80, // A more realistic car mass
        position: new CANNON.Vec3(0, 6, 0), // Start position
        shape: new CANNON.Box(new CANNON.Vec3(1.75, 0.5, 4)) // Main body shape
      }),
    });
    
    // Create the main body (chassis)
    const mainBody = new CANNON.Box(new CANNON.Vec3(1.75, 1, 4));
    vehicle.chassisBody.addShape(mainBody, new CANNON.Vec3(0, 0.2, 0)); // Main car body
    
    // Create the roof (cabin)
    const roof = new CANNON.Box(new CANNON.Vec3(1.5, 0.8, 2));
    vehicle.chassisBody.addShape(roof, new CANNON.Vec3(0, 2, 0)); // Position roof on top
    
    
    // Add vehicle to the physics world
    physicsWorld.addBody(vehicle.chassisBody);
    
    

    // ============ 
    // part 3
    // add wheels to the RigidVehicle
    // ============
// ============ 
// part 3
// add wheels to the RigidVehicle
// ============
const mass = 5;
const axisWidth = 5;
const wheelRadius = 1;
const wheelHeight = 0.5;
const wheelShape = new CANNON.Cylinder(wheelRadius, wheelRadius, wheelHeight, 20); // Cylinder for wheels
const wheelMaterial = new CANNON.Material('wheel');
const down = new CANNON.Vec3(0, -1, 0);

// Rotate the wheel to stand upright
const wheelQuaternion = new CANNON.Quaternion();
wheelQuaternion.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), Math.PI / 2); // Rotate 90° around Z-axis

// Function to create a wheel body with rotation
function createWheel(position, isSteeringWheel = false) {
  const wheelBody = new CANNON.Body({ mass, material: wheelMaterial });
  wheelBody.addShape(wheelShape, new CANNON.Vec3(0, 0, 0), wheelQuaternion);
  wheelBody.angularDamping = 0.8; // More damping to prevent uncontrolled rolling

  vehicle.addWheel({
    body: wheelBody,
    position,
    axis: new CANNON.Vec3(1, 0, 0), // Ensure correct axis
    direction: down,
    suspensionStiffness: 50, // Stronger suspension to hold the wheels
    suspensionRestLength: 0.2, // Adjusted for proper suspension
    frictionSlip: 5, // Prevent slipping
    dampingRelaxation: 2.3, // Smooth ride
    dampingCompression: 4.4,
    maxSuspensionForce: 10000, // Stronger force to keep the wheels attached
    isFrontWheel: isSteeringWheel,
  });
}

// Add four wheels at correct positions
createWheel(new CANNON.Vec3(-2, -0.5, axisWidth / 2), true); // Front left (steering)
createWheel(new CANNON.Vec3(2, -0.5, axisWidth / 2), true); // Front right (steering)
createWheel(new CANNON.Vec3(-2, -0.5, -axisWidth / 2)); // Rear left
createWheel(new CANNON.Vec3(2, -0.5, -axisWidth / 2)); // Rear right

// Add vehicle to the physics world
vehicle.addToWorld(physicsWorld);




    // ============ 
    // part 4
    // move car based on user input (steering, throttle, etc.)
    const maxSteerVal = 1.4; // 80 degrees in radians
    const steerIncrement = 0.05; // Steering sensitivity
    const maxForce = 300; // Increased force for movement
    const brakeForce = -150; // Increased braking force
    
    let steeringAngle = 0;
    let accelerationForce = 0;
    
    document.addEventListener('keydown', (event) => {
      switch (event.key) {
        case 'w':
        case 'ArrowUp':
          accelerationForce = maxForce; // Apply forward force ONLY to rear wheels
          vehicle.setWheelForce(accelerationForce, 2); // Rear Left
          vehicle.setWheelForce(accelerationForce, 3); // Rear Right
          break;
    
        case 's':
        case 'ArrowDown':
          accelerationForce = brakeForce; // Apply reverse force ONLY to rear wheels
          vehicle.setWheelForce(accelerationForce, 2);
          vehicle.setWheelForce(accelerationForce, 3);
          break;
    
        case 'a':
        case 'ArrowLeft':
          steeringAngle = Math.min(maxSteerVal, steeringAngle + steerIncrement); // Limit to -80° to +80°
          vehicle.setSteeringValue(steeringAngle, 0); // Front Left
          vehicle.setSteeringValue(steeringAngle, 1); // Front Right
          break;
    
        case 'd':
        case 'ArrowRight':
          steeringAngle = Math.max(-maxSteerVal, steeringAngle - steerIncrement);
          vehicle.setSteeringValue(steeringAngle, 0);
          vehicle.setSteeringValue(steeringAngle, 1);
          break;
      }
    });
    
    // Reset acceleration on key release but keep steering
    document.addEventListener('keyup', (event) => {
      switch (event.key) {
        case 'w':
        case 'ArrowUp':
        case 's':
        case 'ArrowDown':
          accelerationForce = 0; // Stop acceleration
          vehicle.setWheelForce(0, 2);
          vehicle.setWheelForce(0, 3);
          break;
      }
    });
    
    const animate = () => {
      physicsWorld.fixedStep();
      cannonDebugger.update();
    
      // Sync chassis position and rotation
      const chassis = test.scene.getObjectByName('chassis');
      if (chassis) {
        chassis.position.copy(vehicle.chassisBody.position);
        chassis.quaternion.copy(vehicle.chassisBody.quaternion);
      }
    
      // Sync each wheel's position & rotation
      vehicle.wheelBodies.forEach((wheelBody, index) => {
        const wheelMesh = test.scene.getObjectByName(`wheel_${index}`);
        if (wheelMesh) {
          wheelMesh.position.copy(wheelBody.position);
    
          if (index < 2) {
            // **Front Wheels (Steering)**
            wheelMesh.quaternion.copy(wheelBody.quaternion);
          } else {
            // **Rear Wheels (Rolling)**
            const wheelRotation = new THREE.Quaternion();
            const rotationSpeed = accelerationForce !== 0 ? 0.1 : 0; // Rotate only when moving
            wheelRotation.setFromAxisAngle(new THREE.Vector3(1, 0, 0), wheelBody.angularVelocity.length() * rotationSpeed);
            wheelMesh.quaternion.multiplyQuaternions(wheelBody.quaternion, wheelRotation);
          }
        }
      });
    
      window.requestAnimationFrame(animate);
    };
    
    animate();
    
    
    
  }, []);

  return (
    <div>
      <canvas id="myThreeJsCanvas" />
    </div>
  );
}

export default App;
