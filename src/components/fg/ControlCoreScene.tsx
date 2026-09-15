import { Line } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";

import { CAPABILITIES, type CapabilityId } from "@/lib/fg-data";

const ACCENT = "#7fd8e8";
const NODE_DIM = "#4b6472";

function nodePositions(radius: number) {
  return CAPABILITIES.map((cap, i) => {
    const angle = (i / CAPABILITIES.length) * Math.PI * 2;
    const tilt = Math.sin(i * 1.7) * 0.9;
    return {
      cap,
      pos: new THREE.Vector3(Math.cos(angle) * radius, tilt, Math.sin(angle) * radius),
    };
  });
}

function Core({ active }: { active: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    if (ref.current) ref.current.rotation.y += dt * 0.12;
    if (inner.current) {
      const breathe = 1 + Math.sin(state.clock.elapsedTime * 0.8) * 0.03;
      inner.current.scale.setScalar(breathe * (active ? 1.06 : 1));
    }
  });

  return (
    <group ref={ref}>
      <mesh ref={inner}>
        <icosahedronGeometry args={[1.05, 1]} />
        <meshStandardMaterial
          color="#0e1a20"
          emissive={ACCENT}
          emissiveIntensity={0.45}
          metalness={0.7}
          roughness={0.25}
          flatShading
        />
      </mesh>
      <mesh>
        <icosahedronGeometry args={[1.55, 1]} />
        <meshBasicMaterial color={ACCENT} wireframe transparent opacity={0.18} />
      </mesh>
      <pointLight position={[0, 0, 0]} intensity={8} distance={12} color={ACCENT} />
    </group>
  );
}

function Connection({
  curve,
  highlighted,
  particles,
}: {
  curve: THREE.QuadraticBezierCurve3;
  highlighted: boolean;
  particles: number;
}) {
  const points = useMemo(() => curve.getPoints(28), [curve]);
  const dots = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const offsets = useMemo(
    () => Array.from({ length: particles }, (_, i) => i / particles),
    [particles],
  );

  useFrame((state) => {
    if (!dots.current) return;
    const t = state.clock.elapsedTime * 0.18;
    offsets.forEach((offset, i) => {
      const p = curve.getPoint((t + offset) % 1);
      dummy.position.copy(p);
      dummy.scale.setScalar(highlighted ? 0.055 : 0.035);
      dummy.updateMatrix();
      dots.current!.setMatrixAt(i, dummy.matrix);
    });
    dots.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <Line
        points={points}
        color={highlighted ? ACCENT : NODE_DIM}
        lineWidth={highlighted ? 1.8 : 1}
        transparent
        opacity={highlighted ? 0.9 : 0.35}
      />
      <instancedMesh ref={dots} args={[undefined, undefined, particles]}>
        <sphereGeometry args={[1, 6, 6]} />
        <meshBasicMaterial color={ACCENT} transparent opacity={highlighted ? 1 : 0.6} />
      </instancedMesh>
    </group>
  );
}

function Node({
  position,
  highlighted,
  onHover,
  onSelect,
  seed,
}: {
  position: THREE.Vector3;
  highlighted: boolean;
  onHover: (hovering: boolean) => void;
  onSelect: () => void;
  seed: number;
}) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.position.y = position.y + Math.sin(t * 0.5 + seed) * 0.08;
    const target = highlighted ? 1.35 : 1;
    ref.current.scale.lerp(new THREE.Vector3(target, target, target), 0.1);
  });

  return (
    <mesh
      ref={ref}
      position={position}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover(true);
      }}
      onPointerOut={() => onHover(false)}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <octahedronGeometry args={[0.24, 0]} />
      <meshStandardMaterial
        color="#0d161b"
        emissive={ACCENT}
        emissiveIntensity={highlighted ? 1.4 : 0.35}
        metalness={0.6}
        roughness={0.3}
      />
    </mesh>
  );
}

function Rig({ focus }: { focus: THREE.Vector3 | null }) {
  const { camera, pointer } = useThree();
  const target = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    if (focus) {
      target.set(focus.x * 1.7, focus.y * 1.6 + 1.2, focus.z * 1.7 + 3.2);
    } else {
      target.set(pointer.x * 1.4, 1.1 + pointer.y * 0.8, 7.4);
    }
    camera.position.lerp(target, 0.045);
    camera.lookAt(0, 0, 0);
  });
  return null;
}

function Scene({
  hovered,
  selected,
  setHovered,
  setSelected,
  quality,
}: {
  hovered: CapabilityId | null;
  selected: CapabilityId | null;
  setHovered: (id: CapabilityId | null) => void;
  setSelected: (id: CapabilityId | null) => void;
  quality: "low" | "high";
}) {
  const nodes = useMemo(() => nodePositions(3.4), []);
  const curves = useMemo(
    () =>
      nodes.map(({ pos }) => {
        const mid = pos.clone().multiplyScalar(0.5);
        mid.y += 0.9;
        mid.x += 0.3;
        return new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, 0), mid, pos);
      }),
    [nodes],
  );
  const active = hovered ?? selected;
  const particles = quality === "high" ? 5 : 2;
  const focus = selected ? (nodes.find((n) => n.cap.id === selected)?.pos ?? null) : null;

  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[5, 6, 4]} intensity={0.8} color="#9fd4e6" />
      <Core active={Boolean(active)} />
      {nodes.map(({ cap, pos }, i) => (
        <group key={cap.id}>
          <Connection
            curve={curves[i]!}
            highlighted={active === cap.id}
            particles={particles}
          />
          <Node
            position={pos}
            seed={i}
            highlighted={active === cap.id}
            onHover={(h) => setHovered(h ? cap.id : null)}
            onSelect={() => setSelected(selected === cap.id ? null : cap.id)}
          />
        </group>
      ))}
      <Rig focus={focus} />
    </>
  );
}

export default function ControlCoreScene({
  hovered,
  selected,
  setHovered,
  setSelected,
}: {
  hovered: CapabilityId | null;
  selected: CapabilityId | null;
  setHovered: (id: CapabilityId | null) => void;
  setSelected: (id: CapabilityId | null) => void;
}) {
  const [quality] = useState<"low" | "high">(() =>
    typeof window !== "undefined" && window.innerWidth < 900 ? "low" : "high",
  );

  return (
    <Canvas
      camera={{ position: [0, 1.2, 7.4], fov: 52 }}
      dpr={[1, quality === "high" ? 1.75 : 1]}
      gl={{ antialias: quality === "high", powerPreference: "high-performance" }}
      frameloop="always"
    >
      <Scene
        hovered={hovered}
        selected={selected}
        setHovered={setHovered}
        setSelected={setSelected}
        quality={quality}
      />
    </Canvas>
  );
}
