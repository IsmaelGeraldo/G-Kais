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
    camera.position.set(0, 0, 5.3);

    const engineGroup = new THREE.Group();
    scene.add(engineGroup);

    const coreGeometry = new THREE.IcosahedronGeometry(0.68, 4);
    const coreMaterial = new THREE.MeshStandardMaterial({
      color: 0x071214,
      metalness: 0.82,
      roughness: 0.24,
      emissive: new THREE.Color(0x0a3f4d),
      emissiveIntensity: 0.48,
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    engineGroup.add(core);

    const wireGeometry = new THREE.IcosahedronGeometry(0.79, 2);
    const wireMaterial = new THREE.MeshBasicMaterial({
      color: 0x79c8ba,
      wireframe: true,
      transparent: true,
      opacity: 0.13,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const wireShell = new THREE.Mesh(wireGeometry, wireMaterial);
    engineGroup.add(wireShell);

    const ringConfigs = [
      { radius: 0.96, tube: 0.012, opacity: 0.42, tiltX: 0.9, tiltY: 0.2 },
      { radius: 1.18, tube: 0.009, opacity: 0.23, tiltX: 1.15, tiltY: -0.52 },
      { radius: 1.39, tube: 0.007, opacity: 0.14, tiltX: 0.42, tiltY: 0.74 },
    ];

    const rings = ringConfigs.map((config, index) => {
      const geometry = new THREE.TorusGeometry(config.radius, config.tube, 8, 96);
      const material = new THREE.MeshBasicMaterial({
        color: index === 0 ? 0x5fb3a4 : 0x0a3f4d,
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
      const radius = 1.05 + Math.random() * 0.62;
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
      size: 0.027,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    engineGroup.add(particles);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.78);
    scene.add(ambientLight);

    const tealLight = new THREE.PointLight(0x2d8c7c, 3.1, 8, 2);
    tealLight.position.set(1.1, 1.2, 2.1);
    scene.add(tealLight);

    const rimLight = new THREE.PointLight(0xcbe9e3, 2.1, 6, 2);
    rimLight.position.set(-1.7, -0.4, 2.4);
    scene.add(rimLight);

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

      engineGroup.rotation.y += 0.0022 * activity;
      core.rotation.x = elapsed * 0.15 * activity;
      core.rotation.y = elapsed * 0.23 * activity;
      wireShell.rotation.x = -elapsed * 0.11 * activity;
      wireShell.rotation.y = elapsed * 0.18 * activity;
      particles.rotation.y = -elapsed * 0.085 * activity;
      particles.rotation.x = elapsed * 0.035 * activity;

      rings[0].ring.rotation.z = elapsed * 0.29 * activity;
      rings[1].ring.rotation.z = -elapsed * 0.22 * activity;
      rings[2].ring.rotation.z = elapsed * 0.14 * activity;

      const processingPulse = processing ? (Math.sin(elapsed * 4.6) + 1) * 0.5 : 0;
      const targetScale = finalState
        ? 1.06
        : processing
          ? 1.02 + processingPulse * 0.055
          : state.step === 0 && state.running
            ? 1 + Math.max(0, Math.sin(elapsed * 3.3)) * 0.025
            : 1;
      core.scale.setScalar(targetScale);
      wireShell.scale.setScalar(targetScale * 1.01);

      coreMaterial.emissiveIntensity = finalState
        ? 0.72
        : processing
          ? 0.82 + processingPulse * 0.52
          : state.running
            ? 0.58
            : 0.34;
      tealLight.intensity = finalState
        ? 3.8
        : processing
          ? 3.4 + processingPulse * 2.1
          : state.running
            ? 2.9
            : 1.5;
      particleMaterial.opacity = processing ? 0.42 + processingPulse * 0.24 : 0.25;

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
      coreGeometry.dispose();
      coreMaterial.dispose();
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
