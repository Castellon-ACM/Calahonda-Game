// Skins: viste tu botella
    //  SKINS: viste tu botella (objetos 3D propios, sin logos ni marcas)
    // =====================================================================
    const SKINS = [
      { id: 'none', label: 'Ninguno', icon: '🚫' },
      { id: 'sunglasses', label: 'Gafas de sol', icon: '😎' },
      { id: 'party', label: 'Gorro fiesta', icon: '🎉' },
      { id: 'scarf', label: 'Bufanda', icon: '🧣' },
      { id: 'bow', label: 'Lazo dorado', icon: '🎀' },
      { id: 'tie', label: 'Corbata', icon: '👔' },
      { id: 'spain', label: 'Bandera España', icon: '🇪🇸' },
      { id: 'cape', label: 'Capa de héroe', icon: '🦸' },
      { id: 'santa', label: 'Gorro navideño', icon: '🎅' },
      { id: 'tophat', label: 'Sombrero copa', icon: '🎩' },
      { id: 'crown', label: 'Corona real', icon: '👑' },
      { id: 'supporter', label: 'Corona de mecenas', icon: '💛' }
    ];

    let currentBottleName = null;
    let currentBottleSkinObj = null;
    const CAP_TOP_Y = 2.4 / 2 + 0.6 + 0.22; // punto justo encima del tapón

    function buildSkinObject(skinId) {
      const group = new THREE.Group();

      if (skinId === 'santa') {
        const hatMat = new THREE.MeshStandardMaterial({ color: 0xb32020, roughness: 0.65 });
        const trimMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 });
        const cone = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.5, 24), hatMat);
        cone.position.y = 0.25;
        cone.rotation.z = 0.18;
        const trim = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.06, 8, 24), trimMat);
        trim.rotation.x = Math.PI / 2;
        const pom = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 16), trimMat);
        pom.position.set(0.12, 0.5, 0);
        group.add(cone, trim, pom);
        group.position.y = CAP_TOP_Y;
      } else if (skinId === 'spain') {
        const redMat = new THREE.MeshStandardMaterial({ color: 0xaa151b, roughness: 0.55 });
        const yellowMat = new THREE.MeshStandardMaterial({ color: 0xf1bf00, roughness: 0.55 });
        const r1 = new THREE.Mesh(new THREE.CylinderGeometry(0.615, 0.615, 0.16, 32, 1, true), redMat);
        const y1 = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.32, 32, 1, true), yellowMat);
        const r2 = new THREE.Mesh(new THREE.CylinderGeometry(0.615, 0.615, 0.16, 32, 1, true), redMat);
        r1.position.y = 0.24;
        r2.position.y = -0.24;
        group.add(r1, y1, r2);
        group.position.y = 0.15;
      } else if (skinId === 'party') {
        const hatMat = new THREE.MeshStandardMaterial({ color: 0x3d84e0, roughness: 0.6 });
        const dotMat = new THREE.MeshStandardMaterial({ color: 0xffe066, roughness: 0.6 });
        const cone = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.55, 24), hatMat);
        cone.position.y = 0.275;
        const pom = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), dotMat);
        pom.position.y = 0.55;
        group.add(cone, pom);
        group.position.y = CAP_TOP_Y;
      } else if (skinId === 'sunglasses') {
        const dark = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3, metalness: 0.3 });
        const lensL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.05), dark);
        lensL.position.set(-0.13, 0, 0.44);
        const lensR = lensL.clone();
        lensR.position.x = 0.13;
        const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.04, 0.04), dark);
        bridge.position.set(0, 0, 0.44);
        group.add(lensL, lensR, bridge);
        group.position.y = 1.0;
      } else if (skinId === 'scarf') {
        const redMat = new THREE.MeshStandardMaterial({ color: 0xb32020, roughness: 0.75 });
        const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 });
        const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.1, 8, 24), redMat);
        wrap.rotation.x = Math.PI / 2;
        const tail = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.45, 0.05), whiteMat);
        tail.position.set(0.2, -0.28, 0.3);
        tail.rotation.z = 0.15;
        group.add(wrap, tail);
        group.position.y = 1.5;
      } else if (skinId === 'bow') {
        const mat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.4, metalness: 0.5 });
        const loopL = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 14), mat);
        loopL.scale.set(1, 0.6, 0.45);
        loopL.position.set(-0.13, 0, 0.3);
        const loopR = loopL.clone();
        loopR.position.x = 0.13;
        const knot = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 14), mat);
        knot.position.set(0, 0, 0.3);
        group.add(loopL, loopR, knot);
        group.position.y = 1.55;
      } else if (skinId === 'tie') {
        const mat = new THREE.MeshStandardMaterial({ color: 0x1a2a6b, roughness: 0.55 });
        const knot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.06), mat);
        const body2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.55, 0.05), mat);
        body2.position.y = -0.32;
        group.add(knot, body2);
        group.position.set(0, 1.5, 0.5);
      } else if (skinId === 'cape') {
        const mat = new THREE.MeshStandardMaterial({ color: 0xb32020, roughness: 0.75, side: THREE.DoubleSide });
        const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 1.35), mat);
        plane.position.set(0, 0.3, -0.5);
        group.add(plane);
      } else if (skinId === 'tophat') {
        const mat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.45 });
        const bandMat = new THREE.MeshStandardMaterial({ color: 0x6b1010, roughness: 0.5 });
        const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.37, 0.05, 24), mat);
        const top = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.42, 24), mat);
        top.position.y = 0.23;
        const band = new THREE.Mesh(new THREE.CylinderGeometry(0.245, 0.245, 0.08, 24), bandMat);
        band.position.y = 0.05;
        group.add(brim, top, band);
        group.position.y = CAP_TOP_Y;
      } else if (skinId === 'crown') {
        const mat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.7, roughness: 0.3 });
        const band = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.14, 16, 1, true), mat);
        band.material.side = THREE.DoubleSide;
        group.add(band);
        for (let i = 0; i < 5; i++) {
          const spike = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.16, 8), mat);
          const ang = i * (Math.PI * 2 / 5);
          spike.position.set(Math.sin(ang) * 0.24, 0.14, Math.cos(ang) * 0.24);
          group.add(spike);
        }
        group.position.y = CAP_TOP_Y;
      } else if (skinId === 'supporter') {
        // Corona exclusiva de mecenas: igual estructura que la corona real,
        // pero en tono rosa-dorado para diferenciarla claramente.
        const mat = new THREE.MeshStandardMaterial({ color: 0xffb6c1, metalness: 0.6, roughness: 0.25, emissive: 0x442233, emissiveIntensity: 0.15 });
        const band = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.14, 16, 1, true), mat);
        band.material.side = THREE.DoubleSide;
        group.add(band);
        for (let i = 0; i < 6; i++) {
          const spike = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.18, 8), mat);
          const ang = i * (Math.PI * 2 / 6);
          spike.position.set(Math.sin(ang) * 0.24, 0.15, Math.cos(ang) * 0.24);
          group.add(spike);
        }
        const gem = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 12), new THREE.MeshStandardMaterial({ color: 0xffe066, metalness: 0.3, roughness: 0.1, emissive: 0xffcc33, emissiveIntensity: 0.5 }));
        gem.position.y = 0.2;
        group.add(gem);
        group.position.y = CAP_TOP_Y;
      }

      return group;
    }

    function applySkinToBottle(name) {
      if (currentBottleSkinObj) {
        bottleGroup.remove(currentBottleSkinObj);
        currentBottleSkinObj = null;
      }
      const data = getCurrentUserData();
      const equipped = (data.skins && data.skins[name]) || 'none';
      if (equipped === 'none') return;
      currentBottleSkinObj = buildSkinObject(equipped);
      bottleGroup.add(currentBottleSkinObj);
    }

    function renderSkinRow(name) {
      const row = document.getElementById('skin-row');
      row.innerHTML = '';
      const data = getCurrentUserData();
      const equipped = (data.skins && data.skins[name]) || 'none';
      const owned = data.ownedSkins || {};
      SKINS.forEach(function (skin) {
        const isOwned = skin.id === 'none' || owned[skin.id];
        const btn = document.createElement('div');
        btn.className = 'skin-btn' + (skin.id === equipped ? ' selected' : '') + (isOwned ? '' : ' locked');
        btn.innerHTML =
          '<div class="skin-icon">' + (isOwned ? skin.icon : '🔒') + '</div>' +
          '<div class="skin-label">' + skin.label + '</div>';
        if (isOwned) {
          btn.addEventListener('click', function () {
            const d = getCurrentUserData();
            if (!d.skins) d.skins = {};
            if (skin.id === 'none') delete d.skins[name];
            else d.skins[name] = skin.id;
            saveCurrentUserData(d);
            renderSkinRow(name);
            applySkinToBottle(name);
          });
        }
        row.appendChild(btn);
      });
    }

    document.getElementById('bottle-detail-back').addEventListener('click', function () {
      hideAll();
      if (bottleDetailReturn === 'account') accountScreen.classList.remove('hidden');
      else if (bottleDetailReturn === 'visitor') document.getElementById('visitor-screen').classList.remove('hidden');
      else appScreen.classList.remove('hidden');
    });

    window.addEventListener('load', function () {
      initCoin('coin-login', 176);
      initCoin('coin-register', 120);
      applyStaticBottleFace();
    });

    // --- Icono estático de moneda (solo cara de la botella tallada) ---
    function makeStaticBottleFaceUrl() {
      const size = 128;
      const canvas = document.createElement('canvas');
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext('2d');
      const grad = ctx.createRadialGradient(size * 0.32, size * 0.26, 6, size / 2, size / 2, size * 0.56);
      grad.addColorStop(0, '#fff6d6');
      grad.addColorStop(0.16, '#f3cc5c');
      grad.addColorStop(0.42, '#dba829');
      grad.addColorStop(0.7, '#b8860f');
      grad.addColorStop(1, '#7c5a0c');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,244,200,0.55)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size * 0.44, 0, Math.PI * 2);
      ctx.stroke();
      ctx.save();
      ctx.scale(size / 200, size / 200);
      ctx.fillStyle = '#9c740f';
      drawBottle(ctx);
      ctx.restore();
      return canvas.toDataURL();
    }

    function applyStaticBottleFace() {
      const url = makeStaticBottleFaceUrl();
      document.querySelectorAll('.balance-coin').forEach(function (el) {
        el.style.backgroundImage = 'url(' + url + ')';
      });
    }

    // =====================================================================
