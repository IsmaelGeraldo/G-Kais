import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

interface ThreeEngineCoreProps {
  step: number;
  running: boolean;
  complete: boolean;
}

export const ThreeEngineCore: React.FC<ThreeEngineCoreProps> = ({
  step,
  running,
  complete,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const liveStateRef = useRef({ step, running, complete });
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    liveStateRef.current = { step, running, complete };
  }, [step, running, complete]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let renderer: THREE.WebGLRenderer;

    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      });
    } catch (error) {
      console.warn("[G-KAIS THREE] WebGL unavailable, using CSS fallback.", error);
      setFallback(true);
      return;
    }

    setFallback(false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.setAttribute("aria-hidden", "true");
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0, 5.25);

    const engineGroup = new THREE.Group();
    engineGroup.rotation.x = -0.08;
    scene.add(engineGroup);

    const brainGroup = new THREE.Group();
    engineGroup.add(brainGroup);

    const lobeGeometry = new THREE.SphereGeometry(0.52, 30, 22);
    const lobeMaterial = new THREE.MeshStandardMaterial({
      color: 0x0b1719,
      metalness: 0.62,
      roughness: 0.34,
      emissive: new THREE.Color(0x123f47),
      emissiveIntensity: 0.34,
    });

    const leftLobe = new THREE.Mesh(lobeGeometry, lobeMaterial);
    leftLobe.position.x = -0.26;
    leftLobe.scale.set(0.78, 1.08, 0.88);
    brainGroup.add(leftLobe);

    const rightLobe = new THREE.Mesh(lobeGeometry, lobeMaterial);
    rightLobe.position.x = 0.26;
    rightLobe.scale.set(0.78, 1.08, 0.88);
    brainGroup.add(rightLobe);

    const brainWireMaterial = new THREE.MeshBasicMaterial({
      color: 0x6aa79e,
      wireframe: true,
      transparent: true,
      opacity: 0.08,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const leftWire = new THREE.Mesh(lobeGeometry, brainWireMaterial);
    leftWire.position.copy(leftLobe.position);
    leftWire.scale.copy(leftLobe.scale).multiplyScalar(1.035);
    brainGroup.add(leftWire);

    const rightWire = new THREE.Mesh(lobeGeometry, brainWireMaterial);
    rightWire.position.copy(rightLobe.position);
    rightWire.scale.copy(rightLobe.scale).multiplyScalar(1.035);
    brainGroup.add(rightWire);

    const neuralMaterial = new THREE.MeshBasicMaterial({
      color: 0x7ebbb0,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const neuralCurves = [
      [[-0.55, 0.16, 0.44], [-0.32, 0.36, 0.58], [-0.08, 0.22, 0.52], [0.05, 0.02, 0.56]],
      [[-0.48, -0.18, 0.5], [-0.26, -0.38, 0.58], [-0.03, -0.24, 0.55], [0.08, -0.06, 0.58]],
      [[0.55, 0.18, 0.43], [0.31, 0.37, 0.58], [0.1, 0.2, 0.54], [-0.02, 0.02, 0.57]],
      [[0.49, -0.2, 0.48], [0.3, -0.39, 0.58], [0.08, -0.25, 0.55], [-0.02, -0.05, 0.58]],
      [[-0.42, 0.46, 0.25], [-0.22, 0.56, 0.42], [-0.05, 0.42, 0.5]],
      [[0.42, 0.46, 0.25], [0.22, 0.56, 0.42], [0.05, 0.42, 0.5]],
    ];

    const neuralTubes = neuralCurves.map((curvePoints) => {
      const curve = new THREE.CatmullRomCurve3(
        curvePoints.map(([x, y, z]) => new THREE.Vector3(x, y, z))
      );
      const geometry = new THREE.TubeGeometry(curve, 24, 0.011, 5, false);
      const mesh = new THREE.Mesh(geometry, neuralMaterial);
      brainGroup.add(mesh);
      return { geometry, mesh };
    });

    const seamGeometry = new THREE.CylinderGeometry(0.018, 0.018, 0.88, 8);
    const seamMaterial = new THREE.MeshBasicMaterial({
      color: 0x9fcfc6,
      transparent: true,
      opacity: 0.24,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const seam = new THREE.Mesh(seamGeometry, seamMaterial);
    seam.position.set(0, 0, 0.58);
    brainGroup.add(seam);

    const nodeGeometry = new THREE.SphereGeometry(0.13, 24, 16);
    const nodeMaterial = new THREE.MeshStandardMaterial({
      color: 0x9cc9c1,
      emissive: new THREE.Color(0x3f877b),
      emissiveIntensity: 0.82,
      metalness: 0.2,
      roughness: 0.24,
    });
    const centralNode = new THREE.Mesh(nodeGeometry, nodeMaterial);
    centralNode.position.set(0, 0, 0.7);
    brainGroup.add(centralNode);

    const wireGeometry = new THREE.IcosahedronGeometry(0.9, 2);
    const wireMaterial = new THREE.MeshBasicMaterial({
      color: 0x6da59c,
      wireframe: true,
      transparent: true,
      opacity: 0.06,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const wireShell = new THREE.Mesh(wireGeometry, wireMaterial);
    engineGroup.add(wireShell);

    const ringConfigs = [
      { radius: 1.02, tube: 0.013, opacity: 0.28, tiltX: 0.9, tiltY: 0.2 },
      { radius: 1.23, tube: 0.009, opacity: 0.16, tiltX: 1.15, tiltY: -0.52 },
      { radius: 1.43, tube: 0.007, opacity: 0.1, tiltX: 0.42, tiltY: 0.74 },
    ];

    const rings = ringConfigs.map((config, index) => {
      const geometry = new THREE.TorusGeometry(config.radius, config.tube, 8, 96);
      const material = new THREE.MeshBasicMaterial({
        color: index === 0 ? 0x6aa99f : 0x315f65,
        transparent: true,
        opacity: config.opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const ring = new THREE.Mesh(geometry, material);
      ring.rotation.x = config.tiltX;
      ring.rotation.y = config.tiltY;
      engineGroup.add(ring);
      return { ring, geometry, material };
    });

    const particleCount = 110;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let index = 0; index < particleCount; index += 1) {
      const radius = 1.05 + Math.random() * 0.72;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      particlePositions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
      particlePositions[index * 3 + 1] = radius * Math.cos(phi);
      particlePositions[index * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    const particleMaterial = new THREE.PointsMaterial({
      color: 0x6f9f97,
      size: 0.023,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    engineGroup.add(particles);

    scene.add(new THREE.AmbientLight(0xffffff, 0.58));

    const tealLight = new THREE.PointLight(0x2f7167, 1.45, 8, 2);
    tealLight.position.set(1.1, 1.2, 2.1);
    scene.add(tealLight);

    const rimLight = new THREE.PointLight(0xc2d7d2, 1.1, 6, 2);
    rimLight.position.set(-1.7, -0.4, 2.4);
    scene.add(rimLight);

    const nodeLight = new THREE.PointLight(0x6da99e, 1.35, 4.2, 2);
    nodeLight.position.set(0, 0, 1.25);
    scene.add(nodeLight);

    const resize = () => {
      const rect = mount.getBoundingClientRect();
      const width = Math.max(1, rect.width);
      const height = Math.max(1, rect.height);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);

    const clock = new THREE.Clock();
    let raf = 0;

    const animate = () => {
      raf = window.requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      const state = liveStateRef.current;
      const activity = state.running ? 1 : 0.28;
      const processing = state.step >= 1 && state.step < 4;
      const finalState = state.complete;
      const pulse = (Math.sin(elapsed * 2.7) + 1) * 0.5;

      engineGroup.rotation.y = Math.sin(elapsed * 0.24) * 0.065;
      engineGroup.rotation.x = -0.08 + Math.sin(elapsed * 0.18) * 0.02;
      brainGroup.rotation.y = Math.sin(elapsed * 0.38) * 0.09 * activity;
      brainGroup.rotation.x = Math.sin(elapsed * 0.28) * 0.025 * activity;
      wireShell.rotation.x = -elapsed * 0.045 * activity;
      wireShell.rotation.y = elapsed * 0.07 * activity;
      particles.rotation.y = -elapsed * 0.045 * activity;
      particles.rotation.x = elapsed * 0.016 * activity;

      rings[0].ring.rotation.z = elapsed * 0.17 * activity;
      rings[1].ring.rotation.z = -elapsed * 0.13 * activity;
      rings[2].ring.rotation.z = elapsed * 0.085 * activity;

      const targetScale = finalState
        ? 1.035
        : processing
          ? 1.01 + pulse * 0.026
          : state.running
            ? 1 + pulse * 0.01
            : 1;
      brainGroup.scale.setScalar(targetScale);
      wireShell.scale.setScalar(1.005 + pulse * (processing ? 0.015 : 0.005));
      centralNode.scale.setScalar(0.95 + pulse * (processing ? 0.18 : 0.08));

      lobeMaterial.emissiveIntensity = finalState
        ? 0.5
        : processing
          ? 0.46 + pulse * 0.2
          : state.running
            ? 0.36
            : 0.24;
      nodeMaterial.emissiveIntensity = finalState
        ? 1.05
        : processing
          ? 0.9 + pulse * 0.45
          : 0.72 + pulse * 0.16;
      neuralMaterial.opacity = processing ? 0.3 + pulse * 0.13 : 0.22;
      seamMaterial.opacity = processing ? 0.27 + pulse * 0.1 : 0.2;
      tealLight.intensity = finalState
        ? 1.85
        : processing
          ? 1.65 + pulse * 0.75
          : state.running
            ? 1.35
            : 0.8;
      nodeLight.intensity = processing ? 1.55 + pulse * 0.8 : 1.05 + pulse * 0.28;
      particleMaterial.opacity = processing ? 0.22 + pulse * 0.1 : 0.14;

      neuralTubes.forEach(({ mesh }, index) => {
        mesh.rotation.z = Math.sin(elapsed * 0.35 + index) * 0.006;
      });

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      rings.forEach(({ geometry, material }) => {
        geometry.dispose();
        material.dispose();
      });
      neuralTubes.forEach(({ geometry }) => geometry.dispose());
      lobeGeometry.dispose();
      lobeMaterial.dispose();
      brainWireMaterial.dispose();
      neuralMaterial.dispose();
      seamGeometry.dispose();
      seamMaterial.dispose();
      nodeGeometry.dispose();
      nodeMaterial.dispose();
      wireGeometry.dispose();
      wireMaterial.dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();
      renderer.dispose();

      if (renderer.domElement.parentElement === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      className={
        "gk-three-engine" +
        (running ? " is-running" : "") +
        (complete ? " is-complete" : "")
      }
      ref={mountRef}
      aria-hidden="true"
    >
      {fallback && <span className="gk-three-fallback">G</span>}
      {!fallback && <span className="gk-three-glyph">G</span>}
    </div>
  );
};
