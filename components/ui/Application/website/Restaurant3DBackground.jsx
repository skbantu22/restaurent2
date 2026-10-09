"use client";
// React Compiler assumes plain-React purity/immutability, but React
// Three Fiber's whole animation model is built on directly mutating
// Three.js objects (camera, mesh transforms, materials) every frame
// inside useFrame — going through setState instead would be far too
// slow for 60fps 3D. This is R3F's documented compiler escape hatch.
"use no memo";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, Sparkles } from "@react-three/drei";
import * as THREE from "three";

// ============================================================
// RESTAURANT 3D BACKGROUND
// ============================================================
// Cinematic, ambient 3D food scene for the hero section. Pure CSS/JS
// device-tier detection (no UA sniffing) + prefers-reduced-motion +
// tab-visibility all gate how much (or whether) this renders, so it
// never costs anything on a phone or for a user who's asked for less
// motion.
//
// SWAPPING IN REAL FOOD MODELS
// ----------------------------
// Every entry in FOOD_ITEMS below is drawn with simple primitive
// geometry (no external model files, so there is nothing to fail to
// load). To use a real .glb food model instead for any item:
//
//   1. Drop the file in /public/models/, e.g. /models/burger.glb
//   2. Add `modelUrl: "/models/burger.glb"` to that item's config
//   3. In <FoodItem>, replace the `<PlaceholderMesh>` branch with:
//        const { scene } = useGLTF(item.modelUrl);
//        return <primitive object={scene} />;
//      (import { useGLTF } from "@react-three/drei")
//
// Everything else — floating motion, rotation speed, position,
// parallax, performance tiering — keeps working unchanged, since none
// of it depends on the geometry being a primitive vs. a loaded model.

const FOOD_ITEMS = [
  { id: "burger", type: "burger", position: [3.4, 0.6, -1], scale: 1, speed: 0.6, color: "#c97a3a" },
  { id: "pizza", type: "pizza", position: [4.6, -0.8, -2.5], scale: 1, speed: 0.45, color: "#e0a94a" },
  { id: "pasta", type: "pasta", position: [2.6, -1.6, -3.5], scale: 1, speed: 0.5, color: "#e8c874" },
  { id: "steak", type: "steak", position: [5.4, 1.4, -3], scale: 1, speed: 0.35, color: "#8a4632" },
  { id: "fries", type: "fries", position: [3.9, 1.9, -1.8], scale: 0.9, speed: 0.7, color: "#e3b34a" },
  { id: "tomato", type: "tomato", position: [2.2, 0.8, -2], scale: 0.8, speed: 0.8, color: "#c23b2c" },
  { id: "chili", type: "chili", position: [5.6, -1.9, -1.5], scale: 0.9, speed: 0.65, color: "#b83224" },
  { id: "lemon", type: "lemon", position: [1.6, -0.6, -1.2], scale: 0.7, speed: 0.75, color: "#e8c832" },
  { id: "herbs", type: "herbs", position: [4.2, 0.1, -0.8], scale: 0.8, speed: 0.55, color: "#4a7a3a" },
  { id: "sauce", type: "sauce", position: [3.0, -1.1, -0.6], scale: 0.6, speed: 0.9, color: "#7a2418" },
];

function tierFromWidth(w) {
  return w < 640 ? "mobile" : w < 1024 ? "tablet" : "desktop";
}

function useDeviceTier() {
  const [tier, setTier] = useState(() =>
    typeof window !== "undefined" ? tierFromWidth(window.innerWidth) : "desktop",
  );

  useEffect(() => {
    const onResize = () => setTier(tierFromWidth(window.innerWidth));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return tier;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (e) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

function useTabVisible() {
  const visibleRef = useRef(true);

  useEffect(() => {
    const onVisibility = () => {
      visibleRef.current = document.visibilityState === "visible";
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  return visibleRef;
}

// ---- Placeholder geometry per food type (see swap-in note above) ----
function PlaceholderMesh({ type, color }) {
  const emissive = useMemo(() => new THREE.Color(color).multiplyScalar(0.15), [color]);

  switch (type) {
    case "burger":
      return (
        <group>
          <mesh position={[0, 0.32, 0]} castShadow>
            <sphereGeometry args={[0.55, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#d99a4e" roughness={0.6} emissive={emissive} />
          </mesh>
          <mesh castShadow>
            <cylinderGeometry args={[0.56, 0.56, 0.22, 24]} />
            <meshStandardMaterial color="#6b3a22" roughness={0.7} emissive={emissive} />
          </mesh>
          <mesh position={[0, -0.22, 0]} castShadow>
            <cylinderGeometry args={[0.58, 0.5, 0.2, 24]} />
            <meshStandardMaterial color="#c9863f" roughness={0.6} emissive={emissive} />
          </mesh>
        </group>
      );
    case "pizza":
      return (
        <mesh castShadow rotation={[0, 0, Math.PI]}>
          <coneGeometry args={[0.7, 0.9, 3]} />
          <meshStandardMaterial color={color} roughness={0.5} emissive={emissive} />
        </mesh>
      );
    case "pasta":
      return (
        <group>
          <mesh castShadow>
            <torusKnotGeometry args={[0.4, 0.12, 64, 8, 2, 3]} />
            <meshStandardMaterial color={color} roughness={0.4} emissive={emissive} />
          </mesh>
        </group>
      );
    case "steak":
      return (
        <mesh castShadow scale={[1, 0.35, 0.75]}>
          <boxGeometry args={[0.9, 0.9, 0.9, 2, 2, 2]} />
          <meshStandardMaterial color={color} roughness={0.55} emissive={emissive} />
        </mesh>
      );
    case "fries":
      return (
        <group>
          {[-0.15, -0.05, 0.05, 0.15].map((x, i) => (
            <mesh key={i} castShadow position={[x, 0, 0]} rotation={[0, 0, x * 1.2]}>
              <boxGeometry args={[0.08, 0.7, 0.08]} />
              <meshStandardMaterial color={color} roughness={0.5} emissive={emissive} />
            </mesh>
          ))}
        </group>
      );
    case "tomato":
      return (
        <group>
          <mesh castShadow>
            <sphereGeometry args={[0.4, 24, 24]} />
            <meshStandardMaterial color={color} roughness={0.3} emissive={emissive} />
          </mesh>
          <mesh position={[0, 0.38, 0]}>
            <coneGeometry args={[0.08, 0.15, 8]} />
            <meshStandardMaterial color="#3a6b2a" roughness={0.6} />
          </mesh>
        </group>
      );
    case "chili":
      return (
        <mesh castShadow rotation={[0, 0, 0.6]}>
          <capsuleGeometry args={[0.14, 0.55, 6, 12]} />
          <meshStandardMaterial color={color} roughness={0.35} emissive={emissive} />
        </mesh>
      );
    case "lemon":
      return (
        <mesh castShadow scale={[1, 0.8, 1]}>
          <sphereGeometry args={[0.35, 20, 20]} />
          <meshStandardMaterial color={color} roughness={0.4} emissive={emissive} />
        </mesh>
      );
    case "herbs":
      return (
        <group>
          {[0, 1, 2].map((i) => (
            <mesh key={i} rotation={[0, (i * Math.PI) / 1.5, Math.PI / 5]} position={[0, i * 0.08, 0]}>
              <coneGeometry args={[0.16, 0.36, 4]} />
              <meshStandardMaterial color={color} roughness={0.7} side={THREE.DoubleSide} />
            </mesh>
          ))}
        </group>
      );
    case "sauce":
      return (
        <mesh castShadow scale={[1, 1.3, 1]}>
          <sphereGeometry args={[0.22, 16, 16]} />
          <meshStandardMaterial color={color} roughness={0.2} metalness={0.1} emissive={emissive} />
        </mesh>
      );
    default:
      return (
        <mesh castShadow>
          <sphereGeometry args={[0.4, 16, 16]} />
          <meshStandardMaterial color={color} />
        </mesh>
      );
  }
}

function FoodItem({ item, tabVisibleRef, reducedMotion }) {
  const groupRef = useRef();
  // useState's lazy initializer is guaranteed to run exactly once, so
  // it's the sanctioned way to seed a one-off random value — a plain
  // useRef(Math.random()) call re-evaluates the (impure) expression
  // on every render even though only the first result is ever kept.
  const [initialSpin] = useState(() => Math.random() * Math.PI * 2);
  const spin = useRef(initialSpin);

  useFrame((_, delta) => {
    if (reducedMotion || !tabVisibleRef.current || !groupRef.current) return;
    spin.current += delta * item.speed * 0.3;
    groupRef.current.rotation.y = spin.current;
    groupRef.current.rotation.x = Math.sin(spin.current * 0.6) * 0.15;
  });

  const content = (
    <group ref={groupRef} position={item.position} scale={item.scale}>
      <PlaceholderMesh type={item.type} color={item.color} />
    </group>
  );

  if (reducedMotion) return content;

  return (
    <Float speed={item.speed} floatIntensity={0.6} rotationIntensity={0.15}>
      {content}
    </Float>
  );
}

// Very slow cinematic drift + extremely subtle mouse parallax. Never
// moves aggressively — this is atmosphere, not an interactive toy.
function CameraRig({ reducedMotion, tabVisibleRef }) {
  const { camera, pointer } = useThree();
  const base = useMemo(() => new THREE.Vector3(0, 0, 6), []);

  useFrame((_, delta) => {
    if (!tabVisibleRef.current) return;

    const targetX = reducedMotion ? 0 : pointer.x * 0.25;
    const targetY = reducedMotion ? 0 : pointer.y * 0.15;

    // R3F's camera is a plain Three.js Object3D meant to be mutated
    // every frame from useFrame; this is the library's standard,
    // required pattern.
    // eslint-disable-next-line react-hooks/immutability
    camera.position.x += (base.x + targetX - camera.position.x) * Math.min(delta * 1.2, 1);
    camera.position.y += (base.y + targetY - camera.position.y) * Math.min(delta * 1.2, 1);
    camera.position.z = base.z;
    camera.lookAt(2.5, 0, -2);
  });

  return null;
}

// A handful of soft, slow-drifting translucent puffs standing in for
// steam — cheap (no textures/shaders) but reads fine at the subtlety
// this scene calls for.
function Steam({ count, tabVisibleRef, reducedMotion }) {
  const groupRef = useRef();
  // Same lazy-initializer escape hatch as FoodItem's spin seed above —
  // runs exactly once per mount regardless of later re-renders.
  const [puffs] = useState(() =>
    Array.from({ length: count }, () => ({
      x: 2.5 + Math.random() * 3,
      z: -1 - Math.random() * 3,
      startY: -1.5,
      speed: 0.15 + Math.random() * 0.15,
      offset: Math.random() * 10,
    })),
  );

  useFrame((state) => {
    if (reducedMotion || !tabVisibleRef.current || !groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.children.forEach((mesh, i) => {
      const p = puffs[i];
      const cycle = ((t * p.speed + p.offset) % 4) / 4;
      mesh.position.y = p.startY + cycle * 3;
      mesh.material.opacity = 0.08 * Math.sin(cycle * Math.PI);
    });
  });

  if (reducedMotion) return null;

  return (
    <group ref={groupRef}>
      {puffs.map((p, i) => (
        <mesh key={i} position={[p.x, p.startY, p.z]}>
          <sphereGeometry args={[0.35, 12, 12]} />
          <meshBasicMaterial color="#FFE08A" transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function Scene({ tier, reducedMotion, tabVisibleRef }) {
  const visibleItems = useMemo(() => {
    if (tier === "mobile") return FOOD_ITEMS.slice(0, 3);
    if (tier === "tablet") return FOOD_ITEMS.slice(0, 6);
    return FOOD_ITEMS;
  }, [tier]);

  const particleCount = tier === "mobile" ? 0 : tier === "tablet" ? 40 : 90;
  const steamCount = tier === "mobile" ? 0 : tier === "tablet" ? 2 : 4;

  return (
    <>
      <CameraRig reducedMotion={reducedMotion} tabVisibleRef={tabVisibleRef} />

      <ambientLight intensity={0.25} color="#FFE08A" />
      <directionalLight position={[4, 5, 3]} intensity={1.4} color="#EE3B41" castShadow />
      <pointLight position={[-3, -2, 2]} intensity={0.5} color="#C41D23" />
      <fog attach="fog" args={["#050301", 4, 12]} />

      {visibleItems.map((item) => (
        <FoodItem key={item.id} item={item} tabVisibleRef={tabVisibleRef} reducedMotion={reducedMotion} />
      ))}

      {particleCount > 0 && (
        <Sparkles
          count={particleCount}
          scale={[8, 4, 6]}
          position={[3, 0, -2]}
          size={1.5}
          speed={0.15}
          color="#FFE08A"
          opacity={0.35}
        />
      )}

      {steamCount > 0 && <Steam count={steamCount} tabVisibleRef={tabVisibleRef} reducedMotion={reducedMotion} />}
    </>
  );
}

/**
 * Drop-in cinematic 3D food background. Meant to be dynamically
 * imported with { ssr: false } wherever it's used (see Bigbanner.jsx)
 * — it touches window/document and must never run during SSR.
 */
export default function Restaurant3DBackground({ className = "" }) {
  const tier = useDeviceTier();
  const reducedMotion = usePrefersReducedMotion();
  const tabVisibleRef = useTabVisible();

  const dpr = tier === "mobile" ? 1 : tier === "tablet" ? [1, 1.5] : [1, 2];

  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`} aria-hidden="true">
      <Canvas
        dpr={dpr}
        gl={{ antialias: tier !== "mobile", alpha: true, powerPreference: "high-performance" }}
        camera={{ position: [0, 0, 6], fov: 45 }}
      >
        <Suspense fallback={null}>
          <Scene tier={tier} reducedMotion={reducedMotion} tabVisibleRef={tabVisibleRef} />
        </Suspense>
      </Canvas>
    </div>
  );
}
