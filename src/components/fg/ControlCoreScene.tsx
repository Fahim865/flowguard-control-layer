import { Environment, Html, Lightformer, Line } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";

import { CAPABILITIES, type CapabilityId } from "@/lib/fg-data";

const ACCENT = "#7fd8e8";
const SIGNAL = "#d7f8ff";
const AMBER = "#f3b56a";
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

function Core({ active, reduced }: { active: boolean; reduced: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Mesh>(null);
  const shell = useRef<THREE.Mesh>(null);
  const rings = useRef<THREE.Group>(null);
  const scanner = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    if (ref.current && !reduced) ref.current.rotation.y += dt * 0.1;
    if (shell.current && !reduced) {
      shell.current.rotation.y -= dt * 0.22;
      shell.current.rotation.x += dt * 0.05;
    }
    if (inner.current) {
      const breathe = 1 + (reduced ? 0 : Math.sin(state.clock.elapsedTime * 0.7) * 0.025);
      inner.current.scale.setScalar(breathe * (active ? 1.05 : 1));
    }
    if (rings.current && !reduced) {
      rings.current.rotation.x += dt * (active ? 0.22 : 0.08);
      rings.current.rotation.z -= dt * (active ? 0.16 : 0.055);
    }
    if (scanner.current && !reduced) {
      scanner.current.rotation.z += dt * 0.38;
    }
  });

  return (
    <group ref={ref}>
      <mesh ref={inner}>
        <icosahedronGeometry args={[0.9, 2]} />
        <meshPhysicalMaterial
          color="#11282f"
          emissive={ACCENT}
          emissiveIntensity={active ? 0.35 : 0.22}
          metalness={0.82}
          roughness={0.16}
          clearcoat={0.8}
          clearcoatRoughness={0.18}
          flatShading
        />
      </mesh>
      <mesh ref={shell}>
        <icosahedronGeometry args={[1.42, 1]} />
        <meshBasicMaterial color={ACCENT} wireframe transparent opacity={0.16} />
      </mesh>
      <group ref={rings}>
        <mesh rotation={[Math.PI / 2, 0.25, 0]}>
          <torusGeometry args={[1.72, 0.012, 5, 96]} />
          <meshBasicMaterial color={ACCENT} transparent opacity={0.55} />
        </mesh>
        <mesh rotation={[0.72, 0.15, Math.PI / 2]}>
          <torusGeometry args={[1.92, 0.009, 5, 96]} />
          <meshBasicMaterial color={SIGNAL} transparent opacity={0.22} />
        </mesh>
        <mesh rotation={[-0.48, Math.PI / 2, 0.6]}>
          <torusGeometry args={[1.58, 0.018, 5, 72]} />
          <meshBasicMaterial color={AMBER} transparent opacity={active ? 0.52 : 0.24} />
        </mesh>
      </group>
      <mesh ref={scanner} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.35, 64, 0, Math.PI * 0.42]} />
        <meshBasicMaterial
          color={ACCENT}
          transparent
          opacity={0.04}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh position={[0, 0, -0.15]}>
        <sphereGeometry args={[0.34, 20, 20]} />
        <meshBasicMaterial color={SIGNAL} transparent opacity={0.18} depthWrite={false} />
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
  reduced,
}: {
  curve: THREE.QuadraticBezierCurve3;
  highlighted: boolean;
  dimmed: boolean;
  particles: number;
  reduced: boolean;
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
    const t = reduced ? 0 : state.clock.elapsedTime * (highlighted ? 0.34 : 0.16);
    offsets.forEach((offset, i) => {
      const p = curve.getPoint((t + offset) % 1);
      const tangent = curve.getTangent((t + offset) % 1);
      dummy.position.copy(p);
      dummy.scale.set(highlighted ? 0.12 : 0.065, highlighted ? 0.026 : 0.018, highlighted ? 0.026 : 0.018);
      dummy.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), tangent.normalize());
      dummy.updateMatrix();
      dots.current?.setMatrixAt(i, dummy.matrix);
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
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial
          color={highlighted ? SIGNAL : ACCENT}
          transparent
          opacity={highlighted ? 1 : dimmed ? 0.2 : 0.55}
          blending={THREE.AdditiveBlending}
        />
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
  reduced,
}: {
  position: THREE.Vector3;
  label: string;
  highlighted: boolean;
  dimmed: boolean;
  onHover: (hovering: boolean) => void;
  onSelect: () => void;
  seed: number;
  showLabel: boolean;
  reduced: boolean;
}) {
  const ref = useRef<THREE.Group>(null);
  const halo = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.position.y = reduced ? 0 : Math.sin(t * 0.45 + seed) * 0.07;
    if (!reduced) ref.current.rotation.y += 0.0045;
    const target = highlighted ? 1.4 : 1;
    ref.current.scale.lerp(new THREE.Vector3(target, target, target), 0.12);
    if (halo.current && !reduced) halo.current.rotation.z -= 0.012;
  });

  return (
    <group position={position}>
      <group
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
        <mesh>
          <octahedronGeometry args={[0.26, 0]} />
          <meshStandardMaterial
            color="#0c151a"
            emissive={highlighted ? SIGNAL : ACCENT}
            emissiveIntensity={highlighted ? 1.6 : dimmed ? 0.14 : 0.4}
            metalness={0.65}
            roughness={0.28}
          />
        </mesh>
        <mesh ref={halo} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.39, 0.012, 4, 36]} />
          <meshBasicMaterial color={highlighted ? AMBER : ACCENT} transparent opacity={highlighted ? 0.9 : 0.25} />
        </mesh>
        {highlighted && (
          <mesh rotation={[0, Math.PI / 2, 0]}>
            <torusGeometry args={[0.49, 0.008, 4, 36]} />
            <meshBasicMaterial color={SIGNAL} transparent opacity={0.55} />
          </mesh>
        )}
      </group>
      {showLabel && (
        <Html center position={[0, 0.46, 0]} zIndexRange={[5, 0]} style={{ pointerEvents: "none" }}>
          <span
            className="pointer-events-none select-none whitespace-nowrap font-mono text-[9px] uppercase tracking-[0.2em]"
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

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const damping = 1 - Math.exp(-3.6 * dt);
    smooth.current.x += (pointer.x - smooth.current.x) * 0.05;
    smooth.current.y += (pointer.y - smooth.current.y) * 0.05;
    if (focus) {
      target.set(focus.x * 1.55, focus.y * 1.4 + 1.1, focus.z * 1.55 + 3.6);
      lookTarget.copy(focus).multiplyScalar(0.45);
    } else {
      const px = reduced ? 0 : smooth.current.x;
      const py = reduced ? 0 : smooth.current.y;
      const entrance = reduced ? 0 : Math.max(0, 1 - state.clock.elapsedTime / 2.4);
      const drift = reduced ? 0 : Math.sin(state.clock.elapsedTime * 0.16) * 0.18;
      target.set(px * 1.25 + drift, 1.05 + py * 0.58, 8.8 + entrance * 2.6);
      lookTarget.set(px * 0.2, py * 0.1, 0);
    }
    camera.position.lerp(target, damping);
    look.lerp(lookTarget, 1 - Math.exp(-4.2 * dt));
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
  const nodes = useMemo(() => nodePositions(2.7), []);
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
  const particles = quality === "high" ? 7 : 3;

  useFrame((_, delta) => {
    if (ring.current && !reduced && !active) {
      ring.current.rotation.y += Math.min(delta, 0.05) * 0.045;
    }
  });

  const focus = selected ? (nodes.find((n) => n.cap.id === selected)?.pos ?? null) : null;

  return (
    <>
      <fog attach="fog" args={["#0b1114", 9, 20]} />
      <ambientLight intensity={0.42} />
      <directionalLight position={[5, 6, 4]} intensity={1.15} color="#9fd4e6" />
      <directionalLight position={[-6, -2, -4]} intensity={0.48} color="#6f8ea8" />
      <spotLight position={[0, 7, 3]} intensity={18} angle={0.34} penumbra={0.9} color={ACCENT} />
      <Environment resolution={64}>
        <Lightformer intensity={2.2} color="#b8f3ff" position={[0, 4, 2]} scale={[5, 1, 1]} />
        <Lightformer intensity={1.2} color="#efad63" position={[-4, -1, 1]} rotation-y={Math.PI / 2} scale={[4, 1, 1]} />
      </Environment>
      <Core active={Boolean(active)} reduced={reduced} />
      <group ref={ring}>
        {nodes.map(({ cap, pos }, i) => (
          <group key={cap.id}>
            <Connection
              curve={curves[i]!}
              highlighted={active === cap.id}
              dimmed={Boolean(active) && active !== cap.id}
              particles={particles}
              reduced={reduced}
            />
            <Node
              position={pos}
              label={cap.name}
              seed={i}
              highlighted={active === cap.id}
              dimmed={Boolean(active) && active !== cap.id}
              showLabel={quality === "high"}
              reduced={reduced}
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
