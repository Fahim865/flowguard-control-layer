import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

type Variant = "orbit" | "grid" | "pulse";

function Nodes({ variant }: { variant: Variant }) {
  const group = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const count = variant === "grid" ? 30 : 18;

  const points = useMemo(() => {
    const out: THREE.Vector3[] = [];
    if (variant === "grid") {
      for (let x = 0; x < 6; x++)
        for (let z = 0; z < 5; z++) out.push(new THREE.Vector3((x - 2.5) * 0.9, (z % 3) * 0.16 - 0.2, (z - 2) * 0.9));
    } else {
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        const r = variant === "pulse" ? 1.65 + (i % 3) * 0.38 : 2.2;
        out.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a * 2) * 0.44, Math.sin(a) * r));
      }
    }
    return out;
  }, [variant, count]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    if (group.current) {
      group.current.rotation.y += Math.min(delta, 0.05) * (variant === "pulse" ? -0.1 : 0.09);
      group.current.rotation.x = Math.sin(t * 0.18) * 0.08;
    }
    const m = mesh.current;
    if (!m) return;
    points.forEach((p, i) => {
      const s = 0.07 + Math.abs(Math.sin(t * 0.7 + i * 0.6)) * 0.04;
      dummy.position.set(p.x, p.y + Math.sin(t * 0.5 + i) * 0.08, p.z);
      dummy.scale.setScalar(s);
      dummy.rotation.set(t * 0.3 + i, t * 0.2, 0);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });

  const lineGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const verts: number[] = [];
    for (let i = 0; i < points.length; i++) {
      const a = points[i]!;
      const b = points[(i + 1) % points.length]!;
      verts.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
    g.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
    return g;
  }, [points]);

  return (
    <group ref={group}>
      <instancedMesh ref={mesh} args={[undefined, undefined, points.length]}>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#8fd6e8" emissive="#2f7f96" emissiveIntensity={0.55} metalness={0.65} roughness={0.22} />
      </instancedMesh>
      <lineSegments geometry={lineGeo}>
        <lineBasicMaterial color="#2f7f96" transparent opacity={0.55} />
      </lineSegments>
    </group>
  );
}

function ControlRelay({ variant }: { variant: Variant }) {
  const shell = useRef<THREE.Group>(null);
  const scan = useRef<THREE.Mesh>(null);
  const active = variant === "pulse";
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    if (shell.current) {
      shell.current.rotation.y += dt * (active ? 0.26 : 0.14);
      shell.current.rotation.z += dt * 0.055;
    }
    if (scan.current) scan.current.rotation.z -= dt * 0.28;
  });
  return (
    <group position={[1.7, 0.1, 0]}>
      <group ref={shell}>
        <mesh>
          <icosahedronGeometry args={[0.88, 1]} />
          <meshPhysicalMaterial color="#19313a" emissive="#7fd8e8" emissiveIntensity={0.23} metalness={0.8} roughness={0.2} clearcoat={0.7} flatShading />
        </mesh>
        <mesh rotation={[Math.PI / 5, 0, Math.PI / 4]}>
          <octahedronGeometry args={[1.25, 0]} />
          <meshBasicMaterial color="#d7f8ff" transparent opacity={0.52} wireframe depthWrite={false} />
        </mesh>
      </group>
      <mesh ref={scan} rotation={[1.1, 0.3, 0]}>
        <torusGeometry args={[1.6, 0.018, 5, 80]} />
        <meshBasicMaterial color={active ? "#f3b56a" : "#7fd8e8"} transparent opacity={0.7} />
      </mesh>
      <mesh rotation={[0.3, 0.7, 1.3]}>
        <torusGeometry args={[1.9, 0.009, 4, 80]} />
        <meshBasicMaterial color="#d7f8ff" transparent opacity={0.36} />
      </mesh>
      <pointLight color="#7fd8e8" intensity={2} distance={6} />
    </group>
  );
}

function CameraEntrance() {
  const { camera, size } = useThree();
  const target = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(0.8, 0, 0), []);
  const started = useRef(false);
  useFrame((_, delta) => {
    if (!started.current) {
      camera.position.set(1.6, 2.7, 9.5);
      started.current = true;
    }
    target.set(size.width < 600 ? 0.8 : 0, 1.45, size.width < 600 ? 9 : 6.5);
    camera.position.lerp(target, 1 - Math.exp(-1.3 * Math.min(delta, 0.05)));
    camera.lookAt(look);
  });
  return null;
}

export default function AmbientFieldScene({ variant }: { variant: Variant }) {
  return (
    <Canvas
      dpr={[1, 1.25]}
      camera={{ position: [1.6, 2.7, 9.5], fov: 48 }}
      gl={{ antialias: false, alpha: true, powerPreference: "low-power" }}
      style={{ position: "absolute", inset: 0 }}
    >
      <ambientLight intensity={0.75} />
      <directionalLight position={[3, 4, 2]} intensity={1.3} color="#9fd4e6" />
      <fog attach="fog" args={["#0b1114", 5, 12]} />
      <CameraEntrance />
      <Nodes variant={variant} />
      <ControlRelay variant={variant} />
    </Canvas>
  );
}
