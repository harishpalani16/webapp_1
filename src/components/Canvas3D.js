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
  const [viewport, setViewport] = useState('perspective'); // 'perspective', 'orthographic', 'top', 'front', 'side'
  const [renderMode, setRenderMode] = useState('solid'); // 'solid', 'wireframe', 'both', 'artistic', 'pen', 'ink'
  const [lighting, setLighting] = useState({
    ambient: 0.6,
    directional: 0.8,
    shadows: true,
    lightDirection: { x: 5, y: 5, z: 5 }
  });

  useEffect(() => {
    // Scene setup
    const scene = new THREE.Scene();
    let camera;
    
    // Create camera based on viewport setting
    if (viewport === 'orthographic') {
      const aspect = window.innerWidth / window.innerHeight;
      const frustumSize = 10;
      camera = new THREE.OrthographicCamera(
        -frustumSize * aspect / 2, frustumSize * aspect / 2,
        frustumSize / 2, -frustumSize / 2, 0.1, 1000
      );
    } else {
      camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    }
    
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

    // Create materials for different render modes
    const createMaterial = (mode) => {
      switch (mode) {
        case 'artistic':
          return new THREE.MeshLambertMaterial({ 
            color: 0x666666,
            flatShading: true
          });
        case 'pen':
          return new THREE.MeshBasicMaterial({ 
            color: 0x000000,
            wireframe: true,
            transparent: true,
            opacity: 0.8
          });
        case 'ink':
          return new THREE.MeshBasicMaterial({ 
            color: 0x000000,
            transparent: true,
            opacity: 0.9
          });
        case 'solid':
        default:
          return new THREE.MeshPhongMaterial({ 
            color: 0x888888,
            shininess: 30,
            transparent: false,
            opacity: 1.0
          });
      }
    };

    const material = createMaterial(renderMode);
    const wireframeMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x00ff00,
      wireframe: true,
      transparent: false,
      opacity: 1.0
    });

    // Function to update render mode for all objects
    const updateRenderMode = (mode) => {
      objectGroup.children.forEach(obj => {
        if (obj.userData.type) {
          // Update material based on render mode
          const newMaterial = createMaterial(mode);
          obj.material.dispose(); // Dispose old material
          obj.material = newMaterial;
          
          // Update wireframe material for pen mode
          if (obj.wireframe) {
            if (mode === 'pen') {
              obj.wireframe.material = new THREE.MeshBasicMaterial({ 
                color: 0x000000,
                wireframe: true,
                transparent: true,
                opacity: 0.8
              });
            } else {
              obj.wireframe.material = wireframeMaterial;
            }
          }
          
          switch (mode) {
            case 'solid':
            case 'artistic':
            case 'ink':
              obj.visible = true;
              if (obj.wireframe) obj.wireframe.visible = false;
              break;
            case 'wireframe':
            case 'pen':
              obj.visible = false;
              if (obj.wireframe) obj.wireframe.visible = true;
              break;
            case 'both':
              obj.visible = true;
              if (obj.wireframe) obj.wireframe.visible = obj.userData.selected;
              break;
          }
        }
      });
    };

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
      const mesh = new THREE.Mesh(geometry, createMaterial(renderMode));
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
      
      // Store reference to wireframe in mesh for easy access
      mesh.wireframe = wireframe;
      
      objectGroup.add(mesh);
      objectGroup.add(wireframe);
      
      return { id: objectId, mesh, wireframe, type };
    };

    // Add initial object
    const initialObject = createObject(selectedPrimitive);
    setObjects([initialObject]);

    // Apply initial render mode
    updateRenderMode(renderMode);

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
              // Only change color for solid mode, others have specific colors
              if (renderMode === 'solid' || renderMode === 'both') {
                obj.material.color.setHex(0x888888);
              }
              if (obj.wireframe) {
                if (renderMode === 'wireframe' || renderMode === 'pen') {
                  obj.wireframe.visible = true;
                } else if (renderMode === 'both') {
                  obj.wireframe.visible = obj.userData.selected;
                } else {
                  obj.wireframe.visible = false;
                }
              }
            }
          });
          
          // Select clicked object
          clickedObject.userData.selected = true;
          // Only change color for solid mode, others have specific colors
          if (renderMode === 'solid' || renderMode === 'both') {
            clickedObject.material.color.setHex(0x0066ff);
          }
          if (clickedObject.wireframe) {
            if (renderMode === 'wireframe' || renderMode === 'pen') {
              clickedObject.wireframe.visible = true;
            } else if (renderMode === 'both') {
              clickedObject.wireframe.visible = true;
            } else {
              clickedObject.wireframe.visible = false;
            }
          }
          setSelectedObject(clickedObject);
        } else {
          // Deselect all
          objectGroup.children.forEach(obj => {
            if (obj.userData.type) {
              obj.userData.selected = false;
              // Only change color for solid mode, others have specific colors
              if (renderMode === 'solid' || renderMode === 'both') {
                obj.material.color.setHex(0x888888);
              }
              if (obj.wireframe) {
                if (renderMode === 'wireframe' || renderMode === 'pen') {
                  obj.wireframe.visible = true;
                } else if (renderMode === 'both') {
                  obj.wireframe.visible = obj.userData.selected;
                } else {
                  obj.wireframe.visible = false;
                }
              }
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

    // Add lights with controls
    const ambientLight = new THREE.AmbientLight(0x404040, lighting.ambient);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, lighting.directional);
    directionalLight.position.set(lighting.lightDirection.x, lighting.lightDirection.y, lighting.lightDirection.z);
    directionalLight.castShadow = lighting.shadows;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -10;
    directionalLight.shadow.camera.right = 10;
    directionalLight.shadow.camera.top = 10;
    directionalLight.shadow.camera.bottom = -10;
    scene.add(directionalLight);

    // Add fill lights for better modeling
    const pointLight1 = new THREE.PointLight(0xffffff, 0.4, 100);
    pointLight1.position.set(5, 5, 5);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xffffff, 0.3, 100);
    pointLight2.position.set(-5, 5, -5);
    scene.add(pointLight2);

    // Set camera position based on viewport
    const setCameraView = (view) => {
      switch (view) {
        case 'top':
          camera.position.set(0, 10, 0);
          camera.lookAt(0, 0, 0);
          break;
        case 'front':
          camera.position.set(0, 0, 10);
          camera.lookAt(0, 0, 0);
          break;
        case 'side':
          camera.position.set(10, 0, 0);
          camera.lookAt(0, 0, 0);
          break;
        case 'perspective':
        case 'orthographic':
        default:
          camera.position.set(5, 5, 5);
          camera.lookAt(0, 0, 0);
          break;
      }
    };
    
    setCameraView(viewport);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      
      // Update controls
      controls.update();
      
      // No animations - static modeling environment
      
      renderer.render(scene, camera);
    };

    animate();

    // Handle window resize
    const handleResize = () => {
      if (viewport === 'orthographic') {
        const aspect = window.innerWidth / window.innerHeight;
        const frustumSize = 10;
        camera.left = -frustumSize * aspect / 2;
        camera.right = frustumSize * aspect / 2;
        camera.top = frustumSize / 2;
        camera.bottom = -frustumSize / 2;
        camera.updateProjectionMatrix();
      } else {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
      }
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
  }, [selectedPrimitive, mode, showGrid, snapToGrid, viewport, renderMode, lighting]);


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

      {/* Viewport Controls */}
      <div className="viewport-controls">
        <h3>Viewport</h3>
        <div className="viewport-options">
          <div className="viewport-group">
            <label>Camera:</label>
            <select 
              value={viewport} 
              onChange={(e) => setViewport(e.target.value)}
              className="viewport-select"
            >
              <option value="perspective">Perspective</option>
              <option value="orthographic">Orthographic</option>
              <option value="top">Top View</option>
              <option value="front">Front View</option>
              <option value="side">Side View</option>
            </select>
          </div>
          <div className="viewport-group">
            <label>Render:</label>
            <select 
              value={renderMode} 
              onChange={(e) => setRenderMode(e.target.value)}
              className="viewport-select"
            >
              <option value="solid">Solid</option>
              <option value="wireframe">Wireframe</option>
              <option value="both">Both</option>
              <option value="artistic">Artistic</option>
              <option value="pen">Pen</option>
              <option value="ink">Ink</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lighting Controls */}
      <div className="lighting-controls">
        <h3>Lighting</h3>
        <div className="lighting-options">
          <div className="lighting-group">
            <label>Ambient: {lighting.ambient.toFixed(1)}</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={lighting.ambient}
              onChange={(e) => setLighting(prev => ({ ...prev, ambient: parseFloat(e.target.value) }))}
              className="lighting-slider"
            />
          </div>
          <div className="lighting-group">
            <label>Directional: {lighting.directional.toFixed(1)}</label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={lighting.directional}
              onChange={(e) => setLighting(prev => ({ ...prev, directional: parseFloat(e.target.value) }))}
              className="lighting-slider"
            />
          </div>
          <div className="lighting-group">
            <label>Light Direction X: {lighting.lightDirection.x}</label>
            <input
              type="range"
              min="-10"
              max="10"
              step="1"
              value={lighting.lightDirection.x}
              onChange={(e) => setLighting(prev => ({ 
                ...prev, 
                lightDirection: { ...prev.lightDirection, x: parseInt(e.target.value) }
              }))}
              className="lighting-slider"
            />
          </div>
          <div className="lighting-group">
            <label>Light Direction Y: {lighting.lightDirection.y}</label>
            <input
              type="range"
              min="-10"
              max="10"
              step="1"
              value={lighting.lightDirection.y}
              onChange={(e) => setLighting(prev => ({ 
                ...prev, 
                lightDirection: { ...prev.lightDirection, y: parseInt(e.target.value) }
              }))}
              className="lighting-slider"
            />
          </div>
          <div className="lighting-group">
            <label>Light Direction Z: {lighting.lightDirection.z}</label>
            <input
              type="range"
              min="-10"
              max="10"
              step="1"
              value={lighting.lightDirection.z}
              onChange={(e) => setLighting(prev => ({ 
                ...prev, 
                lightDirection: { ...prev.lightDirection, z: parseInt(e.target.value) }
              }))}
              className="lighting-slider"
            />
          </div>
          <div className="lighting-group">
            <label>
              <input
                type="checkbox"
                checked={lighting.shadows}
                onChange={(e) => setLighting(prev => ({ ...prev, shadows: e.target.checked }))}
              />
              Enable Shadows
            </label>
          </div>
        </div>
      </div>

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
