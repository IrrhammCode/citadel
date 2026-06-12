"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Mesh } from "three";

function SlowOrb() {
  const ref = useRef<Mesh>(null);
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.x = state.clock.elapsedTime * 0.05;
      ref.current.rotation.y = state.clock.elapsedTime * 0.08;
    }
  });
  return (
    <mesh ref={ref}>
      <torusKnotGeometry args={[1.2, 0.15, 128, 16]} />
      <meshBasicMaterial color="#10b981" wireframe transparent opacity={0.04} />
    </mesh>
  );
}

export function AppAmbientScene() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 opacity-40">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 5], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.1} />
          <SlowOrb />
        </Suspense>
      </Canvas>
    </div>
  );
}
