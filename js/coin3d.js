// Moneda 3D (Three.js)

    // =====================================================================
    //  MONEDA 3D (Three.js) — palmera tallada / botella tallada
    // =====================================================================

    function drawPalm(ctx) {
      const trunk = new Path2D("M96,160 C94,138 100,120 97,98 C96,88 99,78 98,64 L102,64 C101,78 104,88 103,98 C100,120 106,138 104,160 Z");
      ctx.fill(trunk);
      const frondD = "M100,64 C94,50 90,34 97,18 C99,13 101,13 103,18 C110,34 106,50 100,64 Z";
      const frond = new Path2D(frondD);
      [-64, -32, 0, 32, 64].forEach(function (a) {
        ctx.save();
        ctx.translate(100, 64);
        ctx.rotate(a * Math.PI / 180);
        ctx.translate(-100, -64);
        ctx.fill(frond);
        ctx.restore();
      });
    }

    function drawBottle(ctx) {
      const bottle = new Path2D("M92,28 L108,28 L108,38 L105,38 L105,58 C120,61 126,68 126,80 L126,150 C126,158 119,164 110,164 L90,164 C81,164 74,158 74,150 L74,80 C74,68 80,61 95,58 L95,38 L92,38 Z");
      ctx.fill(bottle);
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = "#5c4108";
      ctx.fillRect(78, 96, 44, 16);
      ctx.restore();
    }

    function makeCoinTexture(type) {
      const size = 512;

      // --- Textura de color (oro) ---
      const colorCanvas = document.createElement('canvas');
      colorCanvas.width = size; colorCanvas.height = size;
      const cctx = colorCanvas.getContext('2d');
      const grad = cctx.createRadialGradient(size * 0.32, size * 0.26, 20, size / 2, size / 2, size * 0.56);
      grad.addColorStop(0, '#fff6d6');
      grad.addColorStop(0.16, '#f3cc5c');
      grad.addColorStop(0.42, '#dba829');
      grad.addColorStop(0.7, '#b8860f');
      grad.addColorStop(1, '#7c5a0c');
      cctx.fillStyle = grad;
      cctx.fillRect(0, 0, size, size);
      cctx.strokeStyle = 'rgba(255,244,200,0.5)';
      cctx.lineWidth = 6;
      cctx.beginPath();
      cctx.arc(size / 2, size / 2, size * 0.46, 0, Math.PI * 2);
      cctx.stroke();
      cctx.save();
      cctx.translate(size / 2, size / 2);
      cctx.rotate(-Math.PI / 2);
      cctx.translate(-size / 2, -size / 2);
      cctx.scale(size / 200, size / 200);
      cctx.fillStyle = '#9c740f';
      if (type === 'palm') drawPalm(cctx); else drawBottle(cctx);
      cctx.restore();

      // --- Textura de relieve (bump map = tallado real) ---
      const bumpCanvas = document.createElement('canvas');
      bumpCanvas.width = size; bumpCanvas.height = size;
      const bctx = bumpCanvas.getContext('2d');
      bctx.fillStyle = '#808080';
      bctx.fillRect(0, 0, size, size);
      bctx.save();
      bctx.translate(size / 2, size / 2);
      bctx.rotate(-Math.PI / 2);
      bctx.translate(-size / 2, -size / 2);
      bctx.scale(size / 200, size / 200);
      bctx.fillStyle = '#ffffff';
      if (type === 'palm') drawPalm(bctx); else drawBottle(bctx);
      bctx.restore();

      const colorTex = new THREE.CanvasTexture(colorCanvas);
      const bumpTex = new THREE.CanvasTexture(bumpCanvas);
      return { color: colorTex, bump: bumpTex };
    }

    function makeEdgeTexture() {
      const w = 256, h = 24;
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d');
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#f0c94f');
      grad.addColorStop(0.5, '#9c740f');
      grad.addColorStop(1, '#f0c94f');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      for (let x = 0; x < w; x += 6) ctx.fillRect(x, 0, 3, h);
      const tex = new THREE.CanvasTexture(c);
      tex.wrapS = THREE.RepeatWrapping;
      tex.repeat.set(28, 1);
      return tex;
    }

    function initCoin(canvasId, pxSize) {
      const canvas = document.getElementById(canvasId);
      const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.5));
      renderer.setSize(pxSize, pxSize, false);
      renderer.setClearColor(0x000000, 0);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
      camera.position.set(0, 0, 4.6);
      camera.lookAt(0, 0, 0);

      scene.add(new THREE.HemisphereLight(0xfff6d8, 0x15100a, 0.9));
      const dl1 = new THREE.DirectionalLight(0xffffff, 1.2);
      dl1.position.set(2, 3, 4);
      scene.add(dl1);
      const dl2 = new THREE.DirectionalLight(0xffe9b0, 0.5);
      dl2.position.set(-3, -1.5, 2);
      scene.add(dl2);

      const palmTex = makeCoinTexture('palm');
      const bottleTex = makeCoinTexture('bottle');
      const edgeTex = makeEdgeTexture();

      const sideMat = new THREE.MeshStandardMaterial({ map: edgeTex, color: 0xdcb24a, metalness: 0.85, roughness: 0.4 });
      const topMat = new THREE.MeshStandardMaterial({ map: palmTex.color, bumpMap: palmTex.bump, bumpScale: 0.03, metalness: 0.7, roughness: 0.42 });
      const bottomMat = new THREE.MeshStandardMaterial({ map: bottleTex.color, bumpMap: bottleTex.bump, bumpScale: 0.03, metalness: 0.7, roughness: 0.42 });

      const geo = new THREE.CylinderGeometry(1, 1, 0.24, 64, 1, false);
      const mesh = new THREE.Mesh(geo, [sideMat, topMat, bottomMat]);
      mesh.rotation.x = Math.PI / 2;

      const group = new THREE.Group();
      group.add(mesh);
      scene.add(group);

      function animate() {
        group.rotation.y += 0.014;
        renderer.render(scene, camera);
        requestAnimationFrame(animate);
      }
      animate();
    }

    // =====================================================================
