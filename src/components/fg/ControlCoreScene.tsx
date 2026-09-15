import { Html, Line } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";

import { CAPABILITIES, type CapabilityId } from "@/lib/fg-data";

const ACCENT = "#7fd8e8";
const NODE_DIM = "#46606e";

function nodePositions(radius: number) {
  // Two stacked rings: readable separation, real spatial depth.
  return CAPABILITIES.map((cap, i) => {
    const ring = i % 2;
    const angle = (i / CAPABILITIES.length) * Math.PI * 2 + (ring ? 0.22 : 0);
    const r = ring ? radius * 0.78 : radius;
    return {
      cap,
      pos: new THREE.Vector3(
        Math.cos(angle) * r,
        ring ? 0.95 : -0.75,
        Math.sin(angle) * r * 0.82,
      ),
    };
  });
}

function Core({ active }: { active: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Mesh>(null);
  const shell = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    if (ref.current) ref.current.rotation.y += dt * 0.1;
    if (shell.current) {
      shell.current.rotation.y -= dt * 0.22;
      shell.current.rotation.x += dt * 0.05;
    }
    if (inner.current) {
      const breathe = 1 + Math.sin(state.clock.elapsedTime * 0.7) * 0.025;
      inner.current.scale.setScalar(breathe * (active ? 1.05 : 1));
    }
  });

  return (
    <group ref={ref}>
      <mesh ref={inner}>
        <icosahedronGeometry args={[0.9, 1]} />
        <meshStandardMaterial
          color="#11282f"
          emissive={ACCENT}
          emissiveIntensity={active ? 0.35 : 0.22}
          metalness={0.75}
          roughness={0.22}
          flatShading
        />
      </mesh>
      <mesh ref={shell}>
        <icosahedronGeometry args={[1.42, 1]} />
        <meshBasicMaterial color={ACCENT} wireframe transparent opacity={0.16} />
      </mesh>
      <pointLight position={[0, 0, 0]} intensity={11} distance={15} color={ACCENT} />
    </group>
  );
}

function Connection({
  curve,
  highlighted,
  dimmed,
  particles,
}: {
  curve: THREE.QuadraticBezierCurve3;
  highlighted: boolean;
  dimmed: boolean;
  particles: number;
}) {
  const points = useMemo(() => curve.getPoints(32), [curve]);
  const dots = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const offsets = useMemo(
    () => Array.from({ length: particles }, (_, i) => i / particles),
    [particles],
  );

  useFrame((state) => {
    if (!dots.current) return;
    const t = state.clock.elapsedTime * (highlighted ? 0.34 : 0.16);
    offsets.forEach((offset, i) => {
      const p = curve.getPoint((t + offset) % 1);
      dummy.position.copy(p);
      dummy.scale.setScalar(highlighted ? 0.06 : 0.032);
      dummy.updateMatrix();
      dots.current!.setMatrixAt(i, dummy.matrix);
    });
    dots.current.instanceMatrix.needsUpdate = true;
  });

  const opacity = highlighted ? 0.95 : dimmed ? 0.14 : 0.32;

  return (
    <group>
      <Line
        points={points}
        color={highlighted ? ACCENT : NODE_DIM}
        lineWidth={highlighted ? 2.2 : 1}
        transparent
        opacity={opacity}
      />
      <instancedMesh ref={dots} args={[undefined, undefined, particles]}>
        <sphereGeometry args={[1, 6, 6]} />
        <meshBasicMaterial color={ACCENT} transparent opacity={highlighted ? 1 : dimmed ? 0.2 : 0.55} />
      </instancedMesh>
    </group>
  );
}

function Node({
  position,
  label,
  highlighted,
  dimmed,
  onHover,
  onSelect,
  seed,
  showLabel,
}: {
  position: THREE.Vector3;
  label: string;
  highlighted: boolean;
  dimmed: boolean;
  onHover: (hovering: boolean) => void;
  onSelect: () => void;
  seed: number;
  showLabel: boolean;
}) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.position.y = position.y + Math.sin(t * 0.45 + seed) * 0.07;
    ref.current.rotation.y += 0.004;
    const target = highlighted ? 1.4 : 1;
    ref.current.scale.lerp(new THREE.Vector3(target, target, target), 0.12);
  });

  return (
    <group position={position}>
      <mesh
        ref={ref}
        position={[0, 0, 0]}
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
        <octahedronGeometry args={[0.26, 0]} />
        <meshStandardMaterial
          color="#0c151a"
          emissive={ACCENT}
          emissiveIntensity={highlighted ? 1.6 : dimmed ? 0.14 : 0.4}
          metalness={0.65}
          roughness={0.28}
        />
      </mesh>
      {showLabel && (
        <Html center distanceFactor={9} position={[0, 0.48, 0]} zIndexRange={[5, 0]}>
          <span
            className="pointer-events-none select-none whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.22em]"
            style={{
              color: highlighted ? "#e8fbff" : "#8ea7b3",
              opacity: dimmed ? 0.35 : 1,
              textShadow: "0 0 10px rgba(0,0,0,0.9)",
            }}
          >
            {label}
          </span>
        </Html>
      )}
    </group>
  );
}

function Rig({ focus, reduced }: { focus: THREE.Vector3 | null; reduced: boolean }) {
  const { camera, pointer } = useThree();
  const target = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);
  const lookTarget = useMemo(() => new THREE.Vector3(), []);
  const smooth = useRef({ x: 0, y: 0 });

  useFrame(() => {
    smooth.current.x += (pointer.x - smooth.current.x) * 0.05;
    smooth.current.y += (pointer.y - smooth.current.y) * 0.05;
    if (focus) {
      target.set(focus.x * 1.55, focus.y * 1.4 + 1.1, focus.z * 1.55 + 3.6);
      lookTarget.copy(focus).multiplyScalar(0.45);
    } else {
      const px = reduced ? 0 : smooth.current.x;
      const py = reduced ? 0 : smooth.current.y;
      target.set(px * 1.5, 1.05 + py * 0.7, 8.8);
      lookTarget.set(px * 0.2, py * 0.1, 0);
    }
    camera.position.lerp(target, 0.05);
    look.lerp(lookTarget, 0.06);
    camera.lookAt(look);
  });
  return null;
}

function Scene({
  hovered,
  selected,
  setHovered,
  setSelected,
  quality,
  reduced,
}: {
  hovered: CapabilityId | null;
  selected: CapabilityId | null;
  setHovered: (id: CapabilityId | null) => void;
  setSelected: (id: CapabilityId | null) => void;
  quality: "low" | "high";
  reduced: boolean;
}) {
  const ring = useRef<THREE.Group>(null);
  const nodes = useMemo(() => nodePositions(3.15), []);
  const curves = useMemo(
    () =>
      nodes.map(({ pos }) => {
        const mid = pos.clone().multiplyScalar(0.55);
        mid.y += pos.y > 0 ? 0.7 : -0.6;
        mid.x += 0.25;
        return new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, 0), mid, pos);
      }),
    [nodes],
  );
  const active = hovered ?? selected;
  const particles = quality === "high" ? 5 : 2;

  useFrame((_, delta) => {
    if (ring.current && !reduced && !active) {
      ring.current.rotation.y += Math.min(delta, 0.05) * 0.045;
    }
  });

  const focus = selected ? (nodes.find((n) => n.cap.id === selected)?.pos ?? null) : null;

  return (
    <>
      <fog attach="fog" args={["#0b1114", 9, 20]} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[5, 6, 4]} intensity={0.8} color="#9fd4e6" />
      <directionalLight position={[-6, -2, -4]} intensity={0.35} color="#6f8ea8" />
      <Core active={Boolean(active)} />
      <group ref={ring}>
        {nodes.map(({ cap, pos }, i) => (
          <group key={cap.id}>
            <Connection
              curve={curves[i]!}
              highlighted={active === cap.id}
              dimmed={Boolean(active) && active !== cap.id}
              particles={particles}
            />
            <Node
              position={pos}
              label={cap.name}
              seed={i}
              highlighted={active === cap.id}
              dimmed={Boolean(active) && active !== cap.id}
              showLabel={quality === "high"}
              onHover={(h) => setHovered(h ? cap.id : null)}
              onSelect={() => setSelected(selected === cap.id ? null : cap.id)}
            />
          </group>
        ))}
      </group>
      <Rig focus={focus} reduced={reduced} />
    </>
  );
}

export default function ControlCoreScene({
  hovered,
  selected,
  setHovered,
  setSelected,
  active = true,
}: {
  hovered: CapabilityId | null;
  selected: CapabilityId | null;
  setHovered: (id: CapabilityId | null) => void;
  setSelected: (id: CapabilityId | null) => void;
  active?: boolean;
}) {
  const [quality] = useState<"low" | "high">(() =>
    typeof window !== "undefined" && window.innerWidth < 900 ? "low" : "high",
  );
  const [reduced] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  return (
    <Canvas
      camera={{ position: [0, 1.1, 8.8], fov: 50 }}
      dpr={[1, quality === "high" ? 1.6 : 1]}
      gl={{ antialias: quality === "high", powerPreference: "high-performance" }}
      frameloop={active ? "always" : "demand"}
    >
      <Scene
        hovered={hovered}
        selected={selected}
        setHovered={setHovered}
        setSelected={setSelected}
        quality={quality}
        reduced={reduced}
      />
    </Canvas>
  );
}
