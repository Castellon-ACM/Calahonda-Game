// Botella 3D (detalle de colección)
    //  BOTELLA 3D (detalle de colección) — se puede girar con el dedo
    // =====================================================================
    let bottleRenderer = null, bottleScene = null, bottleCamera = null, bottleGroup = null;
    let bottleDragging = false, bottleLastX = 0;
    let bottleDetailReturn = 'app';

    function initBottle3DIfNeeded() {
      if (bottleRenderer) return;
      const canvas = document.getElementById('bottle-3d-canvas');
      bottleRenderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
      bottleRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.5));
      bottleRenderer.setSize(260, 320, false);
      bottleRenderer.setClearColor(0x000000, 0);

      bottleScene = new THREE.Scene();
      bottleCamera = new THREE.PerspectiveCamera(32, 260 / 320, 0.1, 100);
      bottleCamera.position.set(0, 0, 7.5);
      bottleCamera.lookAt(0, 0, 0);

      bottleScene.add(new THREE.HemisphereLight(0xfff6d8, 0x15100a, 0.9));
      const dl1 = new THREE.DirectionalLight(0xffffff, 1.1);
      dl1.position.set(2, 3, 4);
      bottleScene.add(dl1);
      const dl2 = new THREE.DirectionalLight(0xffe9b0, 0.5);
      dl2.position.set(-3, -1, 2);
      bottleScene.add(dl2);

      canvas.addEventListener('pointerdown', function (e) {
        bottleDragging = true;
        bottleLastX = e.clientX;
      });
      window.addEventListener('pointerup', function () { bottleDragging = false; });
      window.addEventListener('pointermove', function (e) {
        if (bottleDragging && bottleGroup) {
          const dx = e.clientX - bottleLastX;
          bottleLastX = e.clientX;
          bottleGroup.rotation.y += dx * 0.012;
        }
      });

      function animate() {
        if (bottleGroup && !bottleDragging) bottleGroup.rotation.y += 0.006;
        bottleRenderer.render(bottleScene, bottleCamera);
        requestAnimationFrame(animate);
      }
      animate();
    }

    function makeBottleLabelTexture(style, name) {
      const w = 256, h = 512;
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = style.glass;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 0.92;
      ctx.fillStyle = style.label;
      ctx.fillRect(0, h * 0.38, w, h * 0.3);
      ctx.globalAlpha = 1;

      const lightLabels = ['#ffffff', '#f0e4c8', '#f4f0e0', '#dfe6c8'];
      ctx.fillStyle = lightLabels.indexOf(style.label) !== -1 ? '#20140a' : '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      let fontSize = 22;
      ctx.font = 'bold ' + fontSize + 'px sans-serif';
      while (ctx.measureText(name).width > w * 0.38 && fontSize > 9) {
        fontSize -= 1;
        ctx.font = 'bold ' + fontSize + 'px sans-serif';
      }
      ctx.fillText(name, w / 2, h * 0.53);
      return new THREE.CanvasTexture(canvas);
    }

    function buildProceduralBottle(style) {
      const tex = makeBottleLabelTexture(style, currentBottleName);
      const bodyMat = new THREE.MeshStandardMaterial({ map: tex, metalness: 0.15, roughness: 0.35 });
      const neckMat = new THREE.MeshStandardMaterial({ color: style.glass, metalness: 0.15, roughness: 0.35 });
      const capMat = new THREE.MeshStandardMaterial({ color: style.cap, metalness: 0.4, roughness: 0.4 });

      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.58, 2.4, 32), bodyMat);
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 0.6, 32), neckMat);
      neck.position.y = 2.4 / 2 + 0.6 / 2;
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.22, 32), capMat);
      cap.position.y = 2.4 / 2 + 0.6 + 0.22 / 2;

      const group = new THREE.Group();
      group.add(body, neck, cap);
      return group;
    }

    // --- Modelo 3D real (geometría de cristal limpia, sin logos) para botellas concretas ---
    const REAL_MODEL_PATHS = {
      "Jägermeister": "assets/jagermeister_bottle.glb"
    };
    const realModelCache = {};

    function loadRealBottleModel(name, onReady) {
      if (realModelCache[name]) {
        onReady(realModelCache[name].clone(true));
        return;
      }
      if (typeof THREE.GLTFLoader === 'undefined') {
        onReady(null);
        return;
      }
      const loader = new THREE.GLTFLoader();
      loader.load(
        REAL_MODEL_PATHS[name],
        function (gltf) {
          realModelCache[name] = gltf.scene;
          onReady(realModelCache[name].clone(true));
        },
        undefined,
        function () { onReady(null); }
      );
    }

    function fitModelToView(model, targetHeight) {
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      if (size.y > 0) {
        const scale = targetHeight / size.y;
        model.scale.setScalar(scale);
      }
      const box2 = new THREE.Box3().setFromObject(model);
      const center2 = box2.getCenter(new THREE.Vector3());
      model.position.sub(center2);
      model.traverse(function (child) {
        if (child.isMesh) {
          child.material.metalness = 0.15;
          child.material.roughness = 0.25;
        }
      });
    }

    function finishBottleSetup(name) {
      currentBottleName = name;
      currentBottleSkinObj = null;
      renderSkinRow(name);
      applySkinToBottle(name);
    }

    function showBottleDetail(name, returnTo) {
      initBottle3DIfNeeded();
      bottleDetailReturn = returnTo || 'app';

      const style = BOTTLE_STYLE[name] || { glass: '#7c5a10', cap: '#3a2a10', label: '#f4d98a' };

      if (bottleGroup) bottleScene.remove(bottleGroup);
      bottleGroup = new THREE.Group();
      bottleGroup.position.y = -0.41;
      bottleScene.add(bottleGroup);

      document.getElementById('bottle-detail-title').textContent = name;

      const data = getCurrentUserData();
      const count = (data.inventory && data.inventory[name]) || 0;
      const prog = levelProgress(count);
      document.getElementById('bottle-detail-level').textContent = 'Nivel ' + prog.level;
      document.getElementById('bottle-detail-fill').style.width = prog.pct + '%';
      document.getElementById('bottle-detail-progress-label').textContent = count + ' de ' + prog.nextThreshold;

      hideAll();
      document.getElementById('bottle-detail-screen').classList.remove('hidden');

      if (REAL_MODEL_PATHS[name]) {
        loadRealBottleModel(name, function (model) {
          if (bottleGroup) bottleGroup.clear();
          if (model) {
            fitModelToView(model, 2.6);
            bottleGroup.add(model);
          } else {
            bottleGroup.add(buildProceduralBottle(style));
          }
          finishBottleSetup(name);
        });
      } else {
        bottleGroup.add(buildProceduralBottle(style));
        finishBottleSetup(name);
      }
    }

    // =====================================================================
