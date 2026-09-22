import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

type Variant = "orbit" | "grid" | "pulse";

function Nodes({ variant }: { variant: Variant }) {
  const group = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const count = variant === "grid" ? 36 : 18;

  const points = useMemo(() => {
    const out: THREE.Vector3[] = [];
    if (variant === "grid") {
      for (let x = 0; x < 6; x++)
        for (let z = 0; z < 6; z++) out.push(new THREE.Vector3((x - 2.5) * 0.9, 0, (z - 2.5) * 0.9));
    } else {
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        const r = variant === "pulse" ? 1.8 + (i % 3) * 0.45 : 2.3;
        out.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a * 2) * 0.4, Math.sin(a) * r));
      }
    }
    return out;
  }, [variant, count]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (group.current) {
      group.current.rotation.y = t * 0.12;
      group.current.rotation.x = Math.sin(t * 0.2) * 0.12;
    }
    const m = mesh.current;
    if (!m) return;
    points.forEach((p, i) => {
      const s = 0.06 + Math.abs(Math.sin(t * 0.9 + i * 0.6)) * 0.05;
      dummy.position.set(p.x, p.y + Math.sin(t * 0.7 + i) * 0.12, p.z);
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
        <meshStandardMaterial color="#8fd6e8" emissive="#2f7f96" emissiveIntensity={0.7} roughness={0.35} />
      </instancedMesh>
      <lineSegments geometry={lineGeo}>
        <lineBasicMaterial color="#2f7f96" transparent opacity={0.35} />
      </lineSegments>
    </group>
  );
}

export default function AmbientFieldScene({ variant }: { variant: Variant }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 1.8, 6], fov: 45 }}
      gl={{ antialias: false, alpha: true, powerPreference: "low-power" }}
      style={{ position: "absolute", inset: 0 }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 4, 2]} intensity={1.1} color="#9fd4e6" />
      <fog attach="fog" args={["#0b1114", 5, 12]} />
      <Nodes variant={variant} />
    </Canvas>
  );
}
