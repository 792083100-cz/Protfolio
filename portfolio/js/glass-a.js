/* Three.js r180. Physical black glass shared by the A and the background.
   A real transmission pass includes the typography behind the foreground mesh. */
(function () {
  "use strict";

  const THREE = window.THREE;
  const canvas = document.getElementById("glassACanvas");
  const stage = document.getElementById("glassStage");
  const hero = document.getElementById("home");
  const resetButton = document.getElementById("glassReset");
  if (!THREE || !canvas || !stage || !hero) return;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance"
    });
  } catch (error) {
    console.error("The physical glass renderer could not start.", error);
    stage.dataset.renderer = "unavailable";
    if (resetButton) resetButton.disabled = true;
    return;
  }

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.transmissionResolutionScale = 0.85;
  renderer.setClearColor(0x000000, 1);

  const scene = new THREE.Scene();
  const backdropScene = new THREE.Scene();
  backdropScene.background = new THREE.Color(0x000000);
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 80);
  camera.position.set(0, 0, 8.5);

  // A floating-point equirectangular studio texture: broad white softboxes,
  // graphite surroundings and narrow, subdued rainbow gradient strips.
  function makeStudioTexture() {
    const width = 1024;
    const height = 512;
    const pixels = new Float32Array(width * height * 4);
    const gaussian = function (value, spread) {
      const t = value / spread;
      return Math.exp(-t * t);
    };
    const spectral = function (wavelength) {
      const t = Math.max(0, Math.min(1, wavelength));
      return [
        gaussian(t - 0.16, 0.20),
        gaussian(t - 0.46, 0.20),
        gaussian(t - 0.77, 0.22)
      ];
    };

    for (let y = 0; y < height; y += 1) {
      const v = y / (height - 1);
      for (let x = 0; x < width; x += 1) {
        const u = x / (width - 1);
        let red = 0.004;
        let green = 0.005;
        let blue = 0.007;

        const key = gaussian(u - 0.18, 0.025) * gaussian(v - 0.35, 0.24) * 6.6;
        const fill = gaussian(u - 0.70, 0.040) * gaussian(v - 0.34, 0.21) * 4.4;
        const ceiling = gaussian(u - 0.47, 0.30) * gaussian(v - 0.10, 0.035) * 2.6;
        red += key + fill * 0.90 + ceiling * 0.93;
        green += key * 0.97 + fill * 0.96 + ceiling * 0.97;
        blue += key * 0.92 + fill + ceiling;

        const offset = v - (0.52 + (u - 0.5) * 0.24);
        const band = gaussian(offset, 0.023) * gaussian(u - 0.48, 0.32) * 1.4;
        const rainbow = spectral(0.50 + offset * 13.0);
        const whiteRim = gaussian(offset + 0.033, 0.0045) * 1.75;
        red += rainbow[0] * band + whiteRim;
        green += rainbow[1] * band + whiteRim;
        blue += rainbow[2] * band + whiteRim;

        const secondaryOffset = v - (0.67 - (u - 0.55) * 0.33);
        const secondary = gaussian(secondaryOffset, 0.014) * gaussian(u - 0.72, 0.16) * 0.7;
        const secondaryColor = spectral(0.50 - secondaryOffset * 19.0);
        red += secondaryColor[0] * secondary;
        green += secondaryColor[1] * secondary;
        blue += secondaryColor[2] * secondary;

        const index = (y * width + x) * 4;
        pixels[index] = red;
        pixels[index + 1] = green;
        pixels[index + 2] = blue;
        pixels[index + 3] = 1;
      }
    }

    const texture = new THREE.DataTexture(pixels, width, height, THREE.RGBAFormat, THREE.FloatType);
    texture.name = "Graphite studio with rainbow gradient strips";
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.colorSpace = THREE.LinearSRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  }

  const studioTexture = makeStudioTexture();
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const studioTarget = pmrem.fromEquirectangular(studioTexture);
  const environment = studioTarget.texture;
  environment.name = "Prefiltered rainbow studio envMap";
  scene.environment = environment;
  backdropScene.environment = environment;
  studioTexture.dispose();
  pmrem.dispose();

  // Clearer graphite transmission with softer white studio reflections.
  // Optical thickness remains independent of the shallow glass extrusion.
  const glass = new THREE.MeshPhysicalMaterial({
    name: "Shared graphite transmission glass",
    color: 0xe8edf0,
    metalness: 0,
    transmission: 1,
    roughness: 0.06,
    ior: 1.5,
    thickness: 2,
    attenuationColor: new THREE.Color(0x9aa3ad),
    attenuationDistance: 5.2,
    envMap: environment,
    envMapIntensity: 1.1,
    dispersion: 0.045,
    clearcoat: 0.7,
    clearcoatRoughness: 0.06,
    specularIntensity: 0.9,
    specularColor: new THREE.Color(0xffffff),
    emissive: 0x000000,
    emissiveIntensity: 0,
    side: THREE.FrontSide
  });

  // A restrained Fresnel lift inside the physical shading model. This adds only
  // a faint white/cool glint at grazing angles; it never draws a colored tube.
  glass.onBeforeCompile = function (shader) {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <opaque_fragment>",
      [
        "float edgeFresnel = pow(1.0 - clamp(dot(normalize(vViewPosition), normal), 0.0, 1.0), 5.0);",
        "vec3 edgeTint = mix(vec3(0.88, 0.93, 1.0), vec3(1.0, 0.95, 0.90), normal.x * 0.5 + 0.5);",
        "outgoingLight += edgeTint * edgeFresnel * 0.020;",
        "#include <opaque_fragment>"
      ].join("\n")
    );
  };
  glass.customProgramCacheKey = function () { return "graphite-physical-fresnel-v2"; };

  function roundedPolygon(points, cornerRadius, isHole) {
    const path = isHole ? new THREE.Path() : new THREE.Shape();
    const corners = points.map(function (point, index) {
      const previous = points[(index + points.length - 1) % points.length];
      const next = points[(index + 1) % points.length];
      const a = new THREE.Vector2(previous[0] - point[0], previous[1] - point[1]);
      const b = new THREE.Vector2(next[0] - point[0], next[1] - point[1]);
      const distance = Math.min(cornerRadius, a.length() * 0.16, b.length() * 0.16);
      a.setLength(distance);
      b.setLength(distance);
      return {
        vertex: new THREE.Vector2(point[0], point[1]),
        before: new THREE.Vector2(point[0] + a.x, point[1] + a.y),
        after: new THREE.Vector2(point[0] + b.x, point[1] + b.y)
      };
    });
    path.moveTo(corners[0].before.x, corners[0].before.y);
    corners.forEach(function (corner, index) {
      if (index > 0) path.lineTo(corner.before.x, corner.before.y);
      path.quadraticCurveTo(corner.vertex.x, corner.vertex.y, corner.after.x, corner.after.y);
    });
    path.lineTo(corners[0].before.x, corners[0].before.y);
    path.closePath();
    return path;
  }

  // Slender tapered stems, a lighter crossbar and a shallow polished extrusion.
  const outline = roundedPolygon([
    [-1.72, -2.60], [-0.29, 2.60], [0.29, 2.60], [1.72, -2.60],
    [1.15, -2.60], [0.64, -0.75], [-0.64, -0.75], [-1.15, -2.60]
  ], 0.045, false);
  const counter = roundedPolygon([
    [-0.49, -0.25], [0.49, -0.25], [0, 1.64]
  ], 0.035, true);
  outline.holes.push(counter);
  const letterGeometry = new THREE.ExtrudeGeometry(outline, {
    depth: 0.18,
    bevelEnabled: true,
    bevelThickness: 0.035,
    bevelSize: 0.035,
    bevelSegments: 8,
    curveSegments: 18,
    steps: 1
  });
  letterGeometry.translate(0, 0, -0.09);
  letterGeometry.computeBoundingSphere();
  const letter = new THREE.Mesh(letterGeometry, glass);
  letter.name = "Foreground physical-glass A";
  const letterGroup = new THREE.Group();
  letterGroup.add(letter);
  letterGroup.rotation.set(0.12, -0.23, -0.085);
  letterGroup.position.z = 0.25;
  scene.add(letterGroup);

  const textClearance = 0.75;
  let typographyDepth = -6;

  function updateDepthSeparation() {
    // The whole scaled A must stay in front of the text at EVERY rotation,
    // not just at its resting angle. A rotation preserves this bounding sphere.
    letter.updateMatrix();
    const spinBounds = letterGeometry.boundingSphere.clone().applyMatrix4(letter.matrix);
    const spinRadius = spinBounds.center.length() + spinBounds.radius;
    typographyDepth = letterGroup.position.z - spinRadius - textClearance;
    stage.dataset.textDepth = typographyDepth.toFixed(4);
    stage.dataset.rotationRadius = spinRadius.toFixed(4);
    stage.dataset.depthClearance = String(textClearance);
  }

  // Keep the shared-glass panel setup available, but use an uninterrupted black
  // backdrop for this composition. Only the foreground A catches studio light.
  const backdropPanels = new THREE.Group();
  backdropPanels.visible = false;
  backdropScene.add(backdropPanels);

  function makePanel(width, height, position, rotation) {
    const shape = roundedPolygon([
      [-width / 2, -height / 2], [width / 2, -height / 2],
      [width / 2, height / 2], [-width / 2, height / 2]
    ], 0.025, false);
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.10,
      bevelEnabled: true,
      bevelThickness: 0.018,
      bevelSize: 0.018,
      bevelSegments: 5,
      curveSegments: 8,
      steps: 1
    });
    geometry.translate(0, 0, -0.05);
    const panel = new THREE.Mesh(geometry, glass);
    panel.name = "Background panel with the identical physical glass";
    panel.position.set(position[0], position[1], position[2]);
    panel.rotation.set(rotation[0], rotation[1], rotation[2]);
    backdropPanels.add(panel);
    return panel;
  }

  makePanel(1.55, 9.4, [-3.05, 0.30, -2.10], [0.06, -0.24, -0.38]);
  makePanel(1.45, 10.0, [2.40, -2.10, -2.60], [-0.16, 0.16, -0.94]);
  makePanel(5.30, 1.45, [3.15, 2.65, -2.40], [0.26, -0.10, -0.43]);

  // Cache the physical background in linear HDR. It becomes the main scene's
  // backdrop, so the A refracts both the panels and the opaque typography pass.
  const backdropTarget = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: true,
    samples: 2
  });
  backdropTarget.texture.colorSpace = THREE.LinearSRGBColorSpace;
  scene.background = backdropTarget.texture;

  const textVertex = [
    "varying vec2 vTextUv;",
    "void main() {",
    "  vTextUv = uv;",
    "  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);",
    "}"
  ].join("\n");
  const textFragment = [
    "uniform sampler2D uText;",
    "varying vec2 vTextUv;",
    "void main() {",
    "  vec4 ink = texture2D(uText, vTextUv);",
    "  if (ink.a < 0.02) discard;",
    "  gl_FragColor = vec4(ink.rgb, 1.0);",
    "  #include <colorspace_fragment>",
    "}"
  ].join("\n");
  const textMeshes = [];

  function trackedWidth(context, text, spacing) {
    const letters = Array.from(text);
    return letters.reduce(function (sum, glyph) {
      return sum + context.measureText(glyph).width;
    }, 0) + Math.max(0, letters.length - 1) * spacing;
  }

  function drawTracked(context, text, anchorX, baseline, spacing, align) {
    let x = align === "left" ? anchorX : anchorX - trackedWidth(context, text, spacing) / 2;
    Array.from(text).forEach(function (glyph) {
      context.fillText(glyph, x, baseline);
      x += context.measureText(glyph).width + spacing;
    });
  }

  function syncText() {
    textMeshes.forEach(function (mesh) {
      scene.remove(mesh);
      mesh.material.uniforms.uText.value.dispose();
      mesh.material.dispose();
      mesh.geometry.dispose();
    });
    textMeshes.length = 0;
    const bounds = stage.getBoundingClientRect();

    // The accessible HTML is the single source of truth for every cover line.
    // This keeps edited copy and its refracted Three.js counterpart in sync.
    hero.querySelectorAll("[data-glass-text]").forEach(function (element) {
      const lines = element.innerText.trim().split(/\r?\n/).map(function (line) {
        return line.trim();
      }).filter(Boolean);
      if (!lines.length) return;
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const fontSize = parseFloat(style.fontSize);
      const lineHeight = parseFloat(style.lineHeight) || fontSize * 1.12;
      const spacing = parseFloat(style.letterSpacing) || 0;
      const padding = fontSize * 0.12;
      const height = fontSize * 1.4 + lineHeight * (lines.length - 1);
      const measuring = document.createElement("canvas").getContext("2d");
      measuring.font = style.fontWeight + " " + fontSize + "px " + style.fontFamily;
      measuring.fontKerning = "none";
      const contentWidth = Math.max.apply(null, lines.map(function (line) {
        return trackedWidth(measuring, line, spacing);
      }));
      const width = Math.max(box.width, contentWidth + padding * 2);
      const density = Math.min(window.devicePixelRatio || 1, 2);
      const image = document.createElement("canvas");
      image.width = Math.ceil(width * density);
      image.height = Math.ceil(height * density);
      const context = image.getContext("2d");
      context.scale(density, density);
      context.font = measuring.font;
      context.fontKerning = "none";
      context.fillStyle = style.color;
      context.textBaseline = "alphabetic";
      const metric = context.measureText(lines.join(""));
      const ascent = metric.actualBoundingBoxAscent;
      const descent = metric.actualBoundingBoxDescent;
      const totalInkHeight = ascent + descent + lineHeight * (lines.length - 1);
      const firstBaseline = (height - totalInkHeight) / 2 + ascent;
      const align = style.textAlign === "left" || style.textAlign === "start" ? "left" : "center";
      const anchorX = align === "left" ? (width - box.width) / 2 : width / 2;
      lines.forEach(function (line, index) {
        drawTracked(context, line, anchorX, firstBaseline + index * lineHeight, spacing, align);
      });

      const texture = new THREE.CanvasTexture(image);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;
      const material = new THREE.ShaderMaterial({
        uniforms: { uText: { value: texture } },
        vertexShader: textVertex,
        fragmentShader: textFragment,
        transparent: false,
        depthWrite: true,
        depthTest: true,
        toneMapped: false
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
      const textZ = typographyDepth;
      const worldHeight = 2 * (camera.position.z - textZ) * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const units = worldHeight / bounds.height;
      const centerX = box.left - bounds.left + box.width / 2;
      const centerY = box.top - bounds.top + box.height / 2;
      mesh.scale.set(width * units, height * units, 1);
      mesh.position.set((centerX - bounds.width / 2) * units,
        (bounds.height / 2 - centerY) * units, textZ);
      mesh.name = "Typography behind A: " + lines.join(" / ");
      scene.add(mesh);
      textMeshes.push(mesh);
    });
  }

  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const autoRotatePeriod = 144;
  const autoRotateSpeed = Math.PI * 2 / autoRotatePeriod;
  const autoRotateResumeDelay = 1800;
  const state = {
    width: 1, height: 1,
    yaw: -0.23, pitch: 0.12,
    targetYaw: -0.23, targetPitch: 0.12,
    dragging: false, pointerId: null,
    x: 0, y: 0,
    visible: true, raf: null, lastFrame: 0, time: 0,
    lastInput: 0, lastPoseReport: -Infinity, backgroundDirty: true
  };

  function advanceMotion(now, delta) {
    const autoRotating = !motion.matches && !state.dragging &&
      (state.lastInput === 0 || now - state.lastInput >= autoRotateResumeDelay);
    if (autoRotating) state.targetYaw += autoRotateSpeed * delta;
    if (!motion.matches) state.time += delta;
    const smoothing = motion.matches ? 1 : 1 - Math.exp(-delta * 16);
    state.yaw += (state.targetYaw - state.yaw) * smoothing;
    state.pitch += (state.targetPitch - state.pitch) * smoothing;
    letterGroup.rotation.y = state.yaw;
    letterGroup.rotation.x = state.pitch;
    letterGroup.position.y = motion.matches ? 0 : Math.sin(state.time * 0.35) * 0.018;

    const phase = motion.matches ? "reduced-motion" : autoRotating ? "running" : "paused";
    if (stage.dataset.autoRotation !== phase) {
      stage.dataset.autoRotation = phase;
      const hint = stage.querySelector(".rotate-hint span");
      if (hint) hint.textContent = phase === "running" ? "自动慢转" : "拖拽旋转";
    }
    // Report the actual rendered pose at a modest rate for preview diagnostics.
    if (now - state.lastPoseReport >= 250) {
      stage.dataset.rotationYaw = letterGroup.rotation.y.toFixed(4);
      stage.dataset.rotationPitch = letterGroup.rotation.x.toFixed(4);
      stage.dataset.rotationRoll = letterGroup.rotation.z.toFixed(4);
      state.lastPoseReport = now;
    }
  }

  function requestRender() {
    if (!state.raf && state.visible && !document.hidden) {
      state.raf = requestAnimationFrame(render);
    }
  }

  function resize() {
    const bounds = stage.getBoundingClientRect();
    if (bounds.width < 1 || bounds.height < 1) return;
    state.width = bounds.width;
    state.height = bounds.height;
    const portrait = bounds.width / bounds.height < 0.85;
    // Enlarge the silhouette without thickening its shallow glass extrusion.
    const letterScale = portrait ? 1.25 : 1.55;
    letter.scale.set(letterScale, letterScale, 1);
    stage.dataset.letterScale = String(letterScale);
    updateDepthSeparation();
    const frameHeight = portrait ? 8.6 : 4.95;
    camera.position.z = frameHeight / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    camera.aspect = bounds.width / bounds.height;
    camera.updateProjectionMatrix();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.8,
      Math.sqrt(1900000 / (bounds.width * bounds.height)));
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(bounds.width, bounds.height, false);
    backdropTarget.setSize(Math.round(bounds.width * pixelRatio), Math.round(bounds.height * pixelRatio));
    state.backgroundDirty = true;
    syncText();
    requestRender();
  }

  function render(now) {
    state.raf = null;
    if (!state.visible || document.hidden || renderer.getContext().isContextLost()) return;
    const delta = state.lastFrame ? Math.min((now - state.lastFrame) / 1000, 0.06) : 1 / 60;
    state.lastFrame = now;
    advanceMotion(now, delta);

    if (state.backgroundDirty) {
      renderer.setRenderTarget(backdropTarget);
      renderer.render(backdropScene, camera);
      renderer.setRenderTarget(null);
      state.backgroundDirty = false;
    }
    renderer.render(scene, camera);

    const unsettled = Math.abs(state.targetYaw - state.yaw) + Math.abs(state.targetPitch - state.pitch) > 0.0001;
    if (!motion.matches || state.dragging || unsettled) requestRender();
  }

  function reset() {
    // Return to the closest equivalent front view, never unwind whole turns.
    const completedTurns = Math.round((state.yaw + 0.23) / (Math.PI * 2));
    state.targetYaw = -0.23 + completedTurns * Math.PI * 2;
    state.targetPitch = 0.12;
    state.lastInput = performance.now();
    requestRender();
  }

  stage.addEventListener("pointerdown", function (event) {
    if (event.target.closest("button") || (event.button !== undefined && event.button !== 0)) return;
    state.dragging = true;
    state.pointerId = event.pointerId;
    state.x = event.clientX;
    state.y = event.clientY;
    state.lastInput = performance.now();
    stage.setPointerCapture(event.pointerId);
    stage.classList.add("is-dragging");
    requestRender();
  });
  stage.addEventListener("pointermove", function (event) {
    if (!state.dragging || state.pointerId !== event.pointerId) return;
    state.targetYaw += (event.clientX - state.x) * 0.008;
    if (event.pointerType !== "touch") {
      state.targetPitch = Math.max(-0.85, Math.min(0.85,
        state.targetPitch + (event.clientY - state.y) * 0.005));
    }
    state.x = event.clientX;
    state.y = event.clientY;
    state.lastInput = performance.now();
    requestRender();
  });
  function release(event) {
    if (event.pointerId !== state.pointerId) return;
    state.dragging = false;
    state.pointerId = null;
    state.lastInput = performance.now();
    stage.classList.remove("is-dragging");
    if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
  }
  stage.addEventListener("pointerup", release);
  stage.addEventListener("pointercancel", release);
  stage.addEventListener("lostpointercapture", release);
  stage.addEventListener("dblclick", function (event) {
    if (!event.target.closest("button")) reset();
  });
  stage.addEventListener("keydown", function (event) {
    if (event.target !== stage) return;
    const step = event.shiftKey ? 0.35 : 0.13;
    if (event.key === "ArrowLeft") state.targetYaw -= step;
    else if (event.key === "ArrowRight") state.targetYaw += step;
    else if (event.key === "ArrowUp") state.targetPitch = Math.max(-0.85, state.targetPitch - step);
    else if (event.key === "ArrowDown") state.targetPitch = Math.min(0.85, state.targetPitch + step);
    else if (event.key.toLowerCase() === "r" || event.key === "Home") reset();
    else return;
    event.preventDefault();
    state.lastInput = performance.now();
    requestRender();
  });
  if (resetButton) resetButton.addEventListener("click", reset);

  new ResizeObserver(resize).observe(stage);
  new IntersectionObserver(function (entries) {
    state.visible = entries[0].isIntersecting;
    state.lastFrame = 0;
    requestRender();
  }, { threshold: 0.01 }).observe(stage);
  document.addEventListener("visibilitychange", function () {
    state.lastFrame = 0;
    requestRender();
  });
  motion.addEventListener("change", requestRender);
  canvas.addEventListener("webglcontextlost", function (event) {
    event.preventDefault();
    if (state.raf) cancelAnimationFrame(state.raf);
    state.raf = null;
  });
  canvas.addEventListener("webglcontextrestored", function () { location.reload(); });

  // Readable verification metadata, populated from the actual material instance.
  stage.dataset.renderer = "three-r" + THREE.REVISION;
  stage.dataset.material = glass.type;
  stage.dataset.transmission = String(glass.transmission);
  stage.dataset.roughness = String(glass.roughness);
  stage.dataset.ior = String(glass.ior);
  stage.dataset.thickness = String(glass.thickness);
  stage.dataset.attenuationDistance = String(glass.attenuationDistance);
  stage.dataset.specularIntensity = String(glass.specularIntensity);
  stage.dataset.extrusion = String(letterGeometry.parameters.options.depth);
  stage.dataset.layerOrder = "background,typography,A";
  stage.dataset.sharedGlass = "true";
  stage.dataset.background = "black";
  stage.dataset.autoRotationPeriod = String(autoRotatePeriod);
  hero.classList.add("three-ready");
  resize();
  document.fonts.ready.then(resize);
})();
