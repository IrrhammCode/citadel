"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, PerspectiveCamera } from "@react-three/drei";
import { CitadelCore } from "@/components/3d/citadel-core";
import { FloatingParticles } from "@/components/3d/floating-particles";

function Scene() {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 6]} fov={45} />
      <ambientLight intensity={0.2} />
      <directionalLight position={[5, 5, 5]} intensity={0.7} color="#10b981" />
      <directionalLight position={[-5, -3, 2]} intensity={0.45} color="#10b981" />
      <pointLight position={[0, 2, 3]} intensity={1.1} color="#10b981" />
      <pointLight position={[3, -2, 1]} intensity={0.55} color="#059669" />

      <CitadelCore />
      <FloatingParticles count={350} />

      <Environment preset="night" />
    </>
  );
}

export function HeroScene({ className }: { className?: string }) {
  return (
    <div className={className}>
      <Canvas
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  );
}
