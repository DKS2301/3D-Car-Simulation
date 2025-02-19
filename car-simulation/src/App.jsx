import { useEffect } from 'react';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import CannonDebugger from 'cannon-es-debugger';
import SceneInit from './lib/SceneInit';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';


function App() {

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
    hdrLoader.load('textures/sky.hdr', (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      test.scene.environment = texture;  
      test.scene.background = texture;  
    });




    const cannonDebugger = new CannonDebugger(test.scene, physicsWorld, {
      color: 0x000000, 
    });

    // Car setup
    const vehicle = new CANNON.RigidVehicle({
      chassisBody: new CANNON.Body({
        mass: 120,
        position: new CANNON.Vec3(0, 6, 0),
        shape: new CANNON.Box(new CANNON.Vec3(1.75, 0.5, 4)),
      }),
    });
    physicsWorld.addBody(vehicle.chassisBody);
    

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(10, 20, 10);
    test.scene.add(light);

    test.scene.add(new THREE.AmbientLight(0x404040));

    // Three.js Mesh for the Car Chassis
    const chassisMesh = new THREE.Group(); // Grouping parts of the car

    // Main Body (Elongated Box)
    const mainBody = new THREE.Mesh(
      new THREE.BoxGeometry(3.5, 3, 8), 
      new THREE.MeshStandardMaterial({ color: 0xff0000 })
    );
    mainBody.position.set(0, 0.5, 0);
    chassisMesh.add(mainBody);


    // Front Bumper
    const frontBumper = new THREE.Mesh(
      new THREE.BoxGeometry(3.0, 0.4, 1),
      new THREE.MeshStandardMaterial({ color: 0x333333 })
    );
    frontBumper.position.set(0, -0.3, 4.0);
    frontBumper.rotation.x = -Math.PI / 2;
    chassisMesh.add(frontBumper);

    // Rear Bumper
    const rearBumper = new THREE.Mesh(
      new THREE.BoxGeometry(3.7, 0.1, 1),
      new THREE.MeshStandardMaterial({ color: 0x333333 })
    );
    rearBumper.rotation.x = -Math.PI / 2;
    rearBumper.position.set(0, -0.5, -4.0);
    chassisMesh.add(rearBumper);

    // Windshield
    const windshield = new THREE.Mesh(
      new THREE.BoxGeometry(3.0, 0.4, 1.3),
      new THREE.MeshStandardMaterial({ color: 0x555555, transparent: true, opacity: 0.8 }) // Glass effect
    );
    windshield.position.set(0, 1.2, 3.95);
    windshield.rotation.x = -Math.PI / 2;
    chassisMesh.add(windshield);

    // Rear Window
    const rearWindow = windshield.clone();
    rearWindow.position.set(0, 1.2, -3.9);
    chassisMesh.add(rearWindow);

    // Headlights
    const headlightMaterial = new THREE.MeshStandardMaterial({ color: 0xffffaa, emissive: 0xffffaa });
    const headlight1 = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 16), headlightMaterial);
    headlight1.position.set(1, -0.3, 3.8);
    chassisMesh.add(headlight1);
    const headlight2 = headlight1.clone();
    headlight2.position.set(-1, -0.3, 3.8);
    chassisMesh.add(headlight2);

    // Taillights
    const taillightMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000 });
    const taillight1 = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 16), taillightMaterial);
    taillight1.position.set(1.4, -0.6, -3.8);
    chassisMesh.add(taillight1);
    const taillight2 = taillight1.clone();
    taillight2.position.set(-1.4, -0.6, -3.8);
    chassisMesh.add(taillight2);

    // Add to scene
    chassisMesh.name = 'chassis';
    test.scene.add(chassisMesh);

    
    // Wheel setup
    const wheelRadius = 1;
    const wheelShape = new CANNON.Cylinder(wheelRadius, wheelRadius, 0.5, 80);
    const wheelMaterial = new CANNON.Material('wheel');
    const down = new CANNON.Vec3(0, -1, 0);
    const wheelQuaternion = new CANNON.Quaternion();
    wheelQuaternion.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), Math.PI / 2);

    // Store wheel meshes for updates
    const wheelMeshes = [];

    function createWheel(position, isSteeringWheel = false) {
      // Create the physics wheel
      const wheelBody = new CANNON.Body({ mass: 5, material: wheelMaterial });
      wheelBody.addShape(wheelShape, new CANNON.Vec3(0, 0, 0), wheelQuaternion);
      wheelBody.angularDamping = 0.8;

      vehicle.addWheel({
        body: wheelBody,
        position,
        axis: new CANNON.Vec3(1, 0, 0),
        direction: down,
        suspensionStiffness: 50,
        suspensionRestLength: 0.2,
        frictionSlip: 5,
        dampingRelaxation: 2.3,
        dampingCompression: 4.4,
        maxSuspensionForce: 10000,
        isFrontWheel: isSteeringWheel,
      });

    }

// Create Wheels
createWheel(new CANNON.Vec3(-2, -0.5, 2.5), true);
createWheel(new CANNON.Vec3(2, -0.5, 2.5), true);
createWheel(new CANNON.Vec3(-2, -0.5, -2.5));
createWheel(new CANNON.Vec3(2, -0.5, -2.5));

vehicle.addToWorld(physicsWorld);

// Input Handling
let steeringAngle = 0;
let accelerationForce = 0;

document.addEventListener('keydown', (event) => {
  switch (event.key) {

    case 'w':
    case 'ArrowUp':
      accelerationForce = 300;
      vehicle.setWheelForce(accelerationForce, 2);
      vehicle.setWheelForce(accelerationForce, 3);
      break;

    case 's':
    case 'ArrowDown':
      accelerationForce = -150;
      vehicle.setWheelForce(accelerationForce, 2);
      vehicle.setWheelForce(accelerationForce, 3);
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
  }
});

document.addEventListener('keyup', (event) => {
  if (['w', 's', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
    accelerationForce = 0;
    vehicle.setWheelForce(0, 2);
    vehicle.setWheelForce(0, 3);
  }
});

// Animation Loop
const animate = () => {
  physicsWorld.fixedStep();
  cannonDebugger.update();

  // Sync chassis
  chassisMesh.position.copy(vehicle.chassisBody.position);
  chassisMesh.quaternion.copy(vehicle.chassisBody.quaternion);

  window.requestAnimationFrame(animate);
  updateCamera()
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
