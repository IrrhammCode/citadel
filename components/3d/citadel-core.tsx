"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial } from "@react-three/drei";
import type { Group, Mesh } from "three";

export function CitadelCore() {
  const groupRef = useRef<Group>(null);
  const innerRef = useRef<Mesh>(null);
  const ringRef = useRef<Mesh>(null);
  const ring2Ref = useRef<Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.15;
      groupRef.current.rotation.x = Math.sin(t * 0.2) * 0.08;
    }
    if (innerRef.current) {
      innerRef.current.rotation.y = -t * 0.25;
      innerRef.current.rotation.z = t * 0.1;
    }
    if (ringRef.current) {
      ringRef.current.rotation.x = Math.PI / 2 + Math.sin(t * 0.3) * 0.1;
      ringRef.current.rotation.z = t * 0.4;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.y = t * 0.35;
      ring2Ref.current.rotation.x = Math.PI / 3;
    }
  });

  return (
    <Float speed={1.2} rotationIntensity={0.3} floatIntensity={0.6}>
      <group ref={groupRef}>
        {/* Inner vault core */}
        <mesh ref={innerRef}>
          <icosahedronGeometry args={[1.1, 1]} />
          <meshStandardMaterial
            color="#0a1a14"
            metalness={0.9}
            roughness={0.15}
            emissive="#10b981"
            emissiveIntensity={0.15}
          />
        </mesh>

        {/* Wireframe shell */}
        <mesh>
          <icosahedronGeometry args={[1.25, 1]} />
          <meshBasicMaterial
            color="#059669"
            wireframe
            transparent
            opacity={0.35}
          />
        </mesh>

        {/* Emerald glow sphere */}
        <mesh>
          <icosahedronGeometry args={[1.35, 0]} />
          <MeshDistortMaterial
            color="#10b981"
            transparent
            opacity={0.08}
            distort={0.25}
            speed={1.5}
            roughness={0}
            metalness={1}
          />
        </mesh>

        {/* Gold orbit ring */}
        <mesh ref={ringRef}>
          <torusGeometry args={[2.1, 0.02, 16, 100]} />
          <meshStandardMaterial
            color="#10b981"
            emissive="#c9a962"
            emissiveIntensity={0.8}
            metalness={1}
            roughness={0.2}
          />
        </mesh>

        {/* Emerald orbit ring */}
        <mesh ref={ring2Ref}>
          <torusGeometry args={[2.5, 0.015, 16, 100]} />
          <meshStandardMaterial
            color="#10b981"
            emissive="#10b981"
            emissiveIntensity={0.6}
            metalness={1}
            roughness={0.3}
          />
        </mesh>

        {/* Corner accent nodes */}
        {[
          [1.8, 0.5, 0.3],
          [-1.5, 0.8, -0.6],
          [0.4, -1.6, 0.9],
          [-0.7, 1.2, 1.5],
        ].map((pos, i) => (
          <mesh key={i} position={pos as [number, number, number]}>
            <octahedronGeometry args={[0.08, 0]} />
            <meshStandardMaterial
              color="#10b981"
              emissive="#c9a962"
              emissiveIntensity={1}
              metalness={1}
              roughness={0.1}
            />
          </mesh>
        ))}
      </group>
    </Float>
  );
}
