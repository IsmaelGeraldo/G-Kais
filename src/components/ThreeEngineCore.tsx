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
      color: 0x071417,
      metalness: 0.66,
      roughness: 0.28,
      emissive: new THREE.Color(0x0a3f4d),
      emissiveIntensity: 0.6,
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
      color: 0x73c7b8,
      wireframe: true,
      transparent: true,
      opacity: 0.12,
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
      color: 0x92dfd0,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const neuralCurves = [
      [
        [-0.55, 0.16, 0.44],
        [-0.32, 0.36, 0.58],
        [-0.08, 0.22, 0.52],
        [0.05, 0.02, 0.56],
      ],
      [
        [-0.48, -0.18, 0.5],
        [-0.26, -0.38, 0.58],
        [-0.03, -0.24, 0.55],
        [0.08, -0.06, 0.58],
      ],
      [
        [0.55, 0.18, 0.43],
        [0.31, 0.37, 0.58],
        [0.1, 0.2, 0.54],
        [-0.02, 0.02, 0.57],
      ],
      [
        [0.49, -0.2, 0.48],
        [0.3, -0.39, 0.58],
        [0.08, -0.25, 0.55],
        [-0.02, -0.05, 0.58],
      ],
      [
        [-0.42, 0.46, 0.25],
        [-0.22, 0.56, 0.42],
        [-0.05, 0.42, 0.5],
      ],
      [
        [0.42, 0.46, 0.25],
        [0.22, 0.56, 0.42],
        [0.05, 0.42, 0.5],
      ],
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

    const seamGeometry = new THREE.CapsuleGeometry(0.018, 0.88, 4, 10);
    const seamMaterial = new THREE.MeshBasicMaterial({
      color: 0xb8f3e9,
      transparent: true,
      opacity: 0.34,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const seam = new THREE.Mesh(seamGeometry, seamMaterial);
    seam.position.set(0, 0, 0.58);
    brainGroup.add(seam);

    const nodeGeometry = new THREE.SphereGeometry(0.13, 24, 16);
    const nodeMaterial = new THREE.MeshStandardMaterial({
      color: 0xb6f0e6,
      emissive: new THREE.Color(0x60c1b0),
      emissiveIntensity: 1.55,
      metalness: 0.18,
      roughness: 0.18,
    });
    const centralNode = new THREE.Mesh(nodeGeometry, nodeMaterial);
    centralNode.position.set(0, 0, 0.7);
    brainGroup.add(centralNode);

    const wireGeometry = new THREE.IcosahedronGeometry(0.9, 2);
    const wireMaterial = new THREE.MeshBasicMaterial({
      color: 0x79c8ba,
      wireframe: true,
      transparent: true,
      opacity: 0.09,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const wireShell = new THREE.Mesh(wireGeometry, wireMaterial);
    engineGroup.add(wireShell);

    const ringConfigs = [
      { radius: 1.02, tube: 0.013, opacity: 0.44, tiltX: 0.9, tiltY: 0.2 },
      { radius: 1.23, tube: 0.009, opacity: 0.24, tiltX: 1.15, tiltY: -0.52 },
      { radius: 1.43, tube: 0.007, opacity: 0.15, tiltX: 0.42, tiltY: 0.74 },
    ];

    const rings = ringConfigs.map((config, index) => {
      const geometry = new THREE.TorusGeometry(config.radius, config.tube, 8, 96);
      const material = new THREE.MeshBasicMaterial({
        color: index === 0 ? 0x71c7b8 : 0x0a3f4d,
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

    const particleCount = 125;
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
    particleGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(particlePositions, 3)
    );
    const particleMaterial = new THREE.PointsMaterial({
      color: 0x74c1b4,
      size: 0.026,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    engineGroup.add(particles);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.72);
    scene.add(ambientLight);

    const tealLight = new THREE.PointLight(0x2d8c7c, 3.2, 8, 2);
    tealLight.position.set(1.1, 1.2, 2.1);
    scene.add(tealLight);

    const rimLight = new THREE.PointLight(0xcbe9e3, 2.2, 6, 2);
    rimLight.position.set(-1.7, -0.4, 2.4);
    scene.add(rimLight);

    const nodeLight = new THREE.PointLight(0x7ad3c2, 2.8, 4.2, 2);
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
      const activity = state.running ? 1 : 0.3;
      const processing = state.step >= 1 && state.step < 4;
      const finalState = state.complete;
      const pulse = (Math.sin(elapsed * 4.4) + 1) * 0.5;

      engineGroup.rotation.y = Math.sin(elapsed * 0.38) * 0.08;
      engineGroup.rotation.x = -0.08 + Math.sin(elapsed * 0.28) * 0.025;
      brainGroup.rotation.y = Math.sin(elapsed * 0.62) * 0.12 * activity;
      brainGroup.rotation.x = Math.sin(elapsed * 0.42) * 0.035 * activity;
      wireShell.rotation.x = -elapsed * 0.08 * activity;
      wireShell.rotation.y = elapsed * 0.13 * activity;
      particles.rotation.y = -elapsed * 0.08 * activity;
      particles.rotation.x = elapsed * 0.028 * activity;

      rings[0].ring.rotation.z = elapsed * 0.31 * activity;
      rings[1].ring.rotation.z = -elapsed * 0.24 * activity;
      rings[2].ring.rotation.z = elapsed * 0.16 * activity;

      const targetScale = finalState
        ? 1.055
        : processing
          ? 1.015 + pulse * 0.045
          : state.running
            ? 1 + pulse * 0.018
            : 1;
      brainGroup.scale.setScalar(targetScale);
      wireShell.scale.setScalar(1.01 + pulse * (processing ? 0.025 : 0.008));
      centralNode.scale.setScalar(0.92 + pulse * (processing ? 0.38 : 0.18));

      lobeMaterial.emissiveIntensity = finalState
        ? 0.88
        : processing
          ? 0.84 + pulse * 0.48
          : state.running
            ? 0.62
            : 0.38;
      nodeMaterial.emissiveIntensity = finalState
        ? 2.2
        : processing
          ? 1.8 + pulse * 1.2
          : 1.35 + pulse * 0.35;
      neuralMaterial.opacity = processing ? 0.46 + pulse * 0.28 : 0.32;
      seamMaterial.opacity = processing ? 0.4 + pulse * 0.25 : 0.28;
      tealLight.intensity = finalState
        ? 4.1
        : processing
          ? 3.7 + pulse * 2.2
          : state.running
            ? 3
            : 1.55;
      nodeLight.intensity = processing ? 3.2 + pulse * 2.5 : 2.1 + pulse * 0.7;
      particleMaterial.opacity = processing ? 0.4 + pulse * 0.24 : 0.24;

      neuralTubes.forEach(({ mesh }, index) => {
        mesh.rotation.z = Math.sin(elapsed * 0.55 + index) * 0.008;
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
