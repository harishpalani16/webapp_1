import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';
import './Canvas3D.css';

const Canvas3D = () => {
  const mountRef = useRef(null);
  const [selectedPrimitive, setSelectedPrimitive] = useState('cube');
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [selectedObject, setSelectedObject] = useState(null);
  const [objects, setObjects] = useState([]);
  const [mode, setMode] = useState('create'); // 'create', 'select', 'move', 'rotate', 'scale'
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridSize] = useState(1);

  useEffect(() => {
    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    
    // Renderer settings
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Add renderer to DOM
    if (mountRef.current) {
      mountRef.current.appendChild(renderer.domElement);
    }

    // Add orbit controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    controls.enablePan = true;

    // Create grid
    const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x444444);
    gridHelper.position.y = -1;
    if (showGrid) {
      scene.add(gridHelper);
    }

    // Create materials
    const material = new THREE.MeshPhongMaterial({ 
      color: 0x00ff88,
      shininess: 100,
      transparent: true,
      opacity: 0.8
    });

    const wireframeMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.3
    });

    // Create primitive geometries
    const geometries = {
      cube: new THREE.BoxGeometry(2, 2, 2),
      sphere: new THREE.SphereGeometry(1.2, 32, 32),
      cylinder: new THREE.CylinderGeometry(1, 1, 2, 32),
      torus: new THREE.TorusGeometry(1, 0.4, 16, 100),
      cone: new THREE.ConeGeometry(1, 2, 32),
      octahedron: new THREE.OctahedronGeometry(1.5)
    };

    // Object management
    const objectGroup = new THREE.Group();
    scene.add(objectGroup);

    // Create object function
    const createObject = (type, position = new THREE.Vector3(0, 0, 0)) => {
      const geometry = geometries[type];
      const mesh = new THREE.Mesh(geometry, material.clone());
      const wireframe = new THREE.Mesh(geometry, wireframeMaterial.clone());
      
      mesh.position.copy(position);
      wireframe.position.copy(position);
      
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      wireframe.visible = false;
      
      const objectId = Date.now() + Math.random();
      mesh.userData = { 
        id: objectId, 
        type: type, 
        selected: false,
        wireframe: wireframe
      };
      wireframe.userData = { id: objectId, type: type };
      
      objectGroup.add(mesh);
      objectGroup.add(wireframe);
      
      return { id: objectId, mesh, wireframe, type };
    };

    // Add initial object
    const initialObject = createObject(selectedPrimitive);
    setObjects([initialObject]);

    // Mouse interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let isDragging = false;
    let dragStart = new THREE.Vector2();

    const onMouseMove = (event) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };

    const onMouseDown = (event) => {
      setIsMouseDown(true);
      isDragging = true;
      dragStart.set(event.clientX, event.clientY);
      
      if (mode === 'create') {
        // Create new object at mouse position
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(objectGroup.children.filter(obj => obj.userData.type));
        
        let position = new THREE.Vector3(0, 0, 0);
        if (intersects.length > 0) {
          position = intersects[0].point;
          if (snapToGrid) {
            position.x = Math.round(position.x / gridSize) * gridSize;
            position.y = Math.round(position.y / gridSize) * gridSize;
            position.z = Math.round(position.z / gridSize) * gridSize;
          }
        }
        
        const newObject = createObject(selectedPrimitive, position);
        setObjects(prev => [...prev, newObject]);
      } else if (mode === 'select') {
        // Select object
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(objectGroup.children.filter(obj => obj.userData.type));
        
        if (intersects.length > 0) {
          const clickedObject = intersects[0].object;
          
          // Deselect all objects
          objectGroup.children.forEach(obj => {
            if (obj.userData.type) {
              obj.userData.selected = false;
              obj.material.color.setHex(0x00ff88);
              obj.userData.wireframe.visible = false;
            }
          });
          
          // Select clicked object
          clickedObject.userData.selected = true;
          clickedObject.material.color.setHex(0xff6b6b);
          clickedObject.userData.wireframe.visible = true;
          setSelectedObject(clickedObject);
        } else {
          // Deselect all
          objectGroup.children.forEach(obj => {
            if (obj.userData.type) {
              obj.userData.selected = false;
              obj.material.color.setHex(0x00ff88);
              obj.userData.wireframe.visible = false;
            }
          });
          setSelectedObject(null);
        }
      }
    };

    const onMouseUp = () => {
      setIsMouseDown(false);
      isDragging = false;
    };

    const onKeyDown = (event) => {
      if (event.key === 'Delete' && selectedObject) {
        // Delete selected object
        objectGroup.remove(selectedObject);
        objectGroup.remove(selectedObject.userData.wireframe);
        setObjects(prev => prev.filter(obj => obj.id !== selectedObject.userData.id));
        setSelectedObject(null);
      }
    };

    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    window.addEventListener('keydown', onKeyDown);

    // Add lights
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Add point lights for more dynamic lighting
    const pointLight1 = new THREE.PointLight(0xff6b6b, 1, 100);
    pointLight1.position.set(-5, 5, 5);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x4ecdc4, 1, 100);
    pointLight2.position.set(5, -5, -5);
    scene.add(pointLight2);

    // Camera position
    camera.position.z = 5;

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      
      // Update controls
      controls.update();
      
      // Rotate all objects
      objectGroup.children.forEach(obj => {
        if (obj.userData.type && !obj.userData.selected) {
          obj.rotation.x += 0.01;
          obj.rotation.y += 0.01;
          if (obj.userData.wireframe) {
            obj.userData.wireframe.rotation.x += 0.01;
            obj.userData.wireframe.rotation.y += 0.01;
          }
        }
      });
      
      // Animate lights
      pointLight1.position.x = Math.sin(Date.now() * 0.001) * 5;
      pointLight2.position.x = Math.cos(Date.now() * 0.001) * 5;
      
      renderer.render(scene, camera);
    };

    animate();

    // Handle window resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', onKeyDown);
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      renderer.domElement.removeEventListener('mouseup', onMouseUp);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [selectedPrimitive, mode, showGrid, snapToGrid]);

  const primitives = [
    { key: 'cube', name: 'Cube', icon: '⬜' },
    { key: 'sphere', name: 'Sphere', icon: '⚪' },
    { key: 'cylinder', name: 'Cylinder', icon: '🥫' },
    { key: 'torus', name: 'Torus', icon: '🍩' },
    { key: 'cone', name: 'Cone', icon: '🔺' },
    { key: 'octahedron', name: 'Octahedron', icon: '💎' }
  ];

  const modes = [
    { key: 'create', name: 'Create', icon: '➕' },
    { key: 'select', name: 'Select', icon: '👆' },
    { key: 'move', name: 'Move', icon: '↔️' },
    { key: 'rotate', name: 'Rotate', icon: '🔄' },
    { key: 'scale', name: 'Scale', icon: '📏' }
  ];

  return (
    <div className="canvas-container">
      <div ref={mountRef} className="canvas-3d" />
      <div className="canvas-overlay">
        <h2>3D Modeling Environment</h2>
        <p>Powered by Three.js</p>
        <div className="controls-info">
          <p>🖱️ Left click + drag: Rotate | Scroll: Zoom | Right click + drag: Pan</p>
          <p>⌨️ Delete: Remove selected object</p>
        </div>
      </div>
      
      {/* Mode Controls */}
      <div className="mode-controls">
        <h3>Tools</h3>
        <div className="mode-buttons">
          {modes.map(modeItem => (
            <button
              key={modeItem.key}
              className={`mode-btn ${mode === modeItem.key ? 'active' : ''}`}
              onClick={() => setMode(modeItem.key)}
            >
              <span className="mode-icon">{modeItem.icon}</span>
              <span className="mode-name">{modeItem.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Primitive Controls */}
      <div className="primitive-controls">
        <h3>Primitives</h3>
        <div className="primitive-buttons">
          {primitives.map(primitive => (
            <button
              key={primitive.key}
              className={`primitive-btn ${selectedPrimitive === primitive.key ? 'active' : ''}`}
              onClick={() => setSelectedPrimitive(primitive.key)}
            >
              <span className="primitive-icon">{primitive.icon}</span>
              <span className="primitive-name">{primitive.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Object Properties */}
      {selectedObject && (
        <div className="object-properties">
          <h3>Object Properties</h3>
          <div className="property-group">
            <label>Type: {selectedObject.userData.type}</label>
            <label>Position: X:{selectedObject.position.x.toFixed(2)} Y:{selectedObject.position.y.toFixed(2)} Z:{selectedObject.position.z.toFixed(2)}</label>
            <label>Rotation: X:{selectedObject.rotation.x.toFixed(2)} Y:{selectedObject.rotation.y.toFixed(2)} Z:{selectedObject.rotation.z.toFixed(2)}</label>
          </div>
        </div>
      )}

      {/* Grid Controls */}
      <div className="grid-controls">
        <h3>Grid</h3>
        <div className="grid-options">
          <label>
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(e) => setShowGrid(e.target.checked)}
            />
            Show Grid
          </label>
          <label>
            <input
              type="checkbox"
              checked={snapToGrid}
              onChange={(e) => setSnapToGrid(e.target.checked)}
            />
            Snap to Grid
          </label>
        </div>
      </div>

      {/* Object List */}
      <div className="object-list">
        <h3>Objects ({objects.length})</h3>
        <div className="object-items">
          {objects.map((obj, index) => (
            <div
              key={obj.id}
              className={`object-item ${selectedObject && selectedObject.userData.id === obj.id ? 'selected' : ''}`}
              onClick={() => {
                // Select object
                const mesh = obj.mesh;
                setSelectedObject(mesh);
              }}
            >
              <span className="object-icon">{primitives.find(p => p.key === obj.type)?.icon}</span>
              <span className="object-name">{obj.type} #{index + 1}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Canvas3D;
