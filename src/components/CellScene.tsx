import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Edges, Float, Html, OrbitControls, RoundedBox, useGLTF } from "@react-three/drei";
import { Suspense, useMemo, useRef } from "react";
import {
  CatmullRomCurve3,
  DoubleSide,
  Group,
  Material,
  Mesh,
  MeshStandardMaterial,
  TubeGeometry,
  Vector3,
  type MeshStandardMaterialParameters,
} from "three";
import { getVehicleModuleById, type ScenePart, type ViewMode } from "../data/vehicle";

const modelAssets = {
  body: "/models/electric-car-body.glb",
  engine: "/models/engine-crankshaft.glb",
  transmission: "/models/transmission-gear.glb",
};

type VehicleSceneProps = {
  activeModuleId: string;
  viewMode: ViewMode;
  autoRotate: boolean;
  resetKey: number;
};

type PartMaterialProps = {
  part: ScenePart;
  activePart: ScenePart;
  viewMode: ViewMode;
  color: string;
  opacity?: number;
  roughness?: number;
  metalness?: number;
};

function partOpacity(part: ScenePart, activePart: ScenePart, viewMode: ViewMode, base: number) {
  if (viewMode === "focus" && part !== activePart) {
    return Math.min(base, 0.16);
  }

  if (viewMode === "xray" && part === "body") {
    return Math.min(base, 0.22);
  }

  return base;
}

function PartMaterial({
  part,
  activePart,
  viewMode,
  color,
  opacity = 1,
  roughness = 0.54,
  metalness = 0.08,
}: PartMaterialProps) {
  const active = part === activePart;
  const displayOpacity = partOpacity(part, activePart, viewMode, opacity);
  const material: MeshStandardMaterialParameters = {
    color,
    roughness,
    metalness,
    transparent: displayOpacity < 1,
    opacity: displayOpacity,
    emissive: active ? color : "#000000",
    emissiveIntensity: active ? 0.18 : 0,
  };

  return <meshStandardMaterial {...material} />;
}

type CurveTubeProps = {
  part: ScenePart;
  activePart: ScenePart;
  viewMode: ViewMode;
  color: string;
  points: Array<[number, number, number]>;
  radius?: number;
  opacity?: number;
};

function CurveTube({
  part,
  activePart,
  viewMode,
  color,
  points,
  radius = 0.025,
  opacity = 1,
}: CurveTubeProps) {
  const geometry = useMemo(() => {
    const curve = new CatmullRomCurve3(points.map((point) => new Vector3(...point)));
    return new TubeGeometry(curve, 80, radius, 12, false);
  }, [points, radius]);

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <PartMaterial
        part={part}
        activePart={activePart}
        viewMode={viewMode}
        color={color}
        opacity={opacity}
        roughness={0.42}
        metalness={0.05}
      />
    </mesh>
  );
}

type LoadedGlbModelProps = {
  url: string;
  part: ScenePart;
  activePart: ScenePart;
  viewMode: ViewMode;
  tint: string;
  activeOpacity: number;
  restOpacity: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  preserveTexture?: boolean;
};

function LoadedGlbModel({
  url,
  part,
  activePart,
  viewMode,
  tint,
  activeOpacity,
  restOpacity,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  preserveTexture = true,
}: LoadedGlbModelProps) {
  const { scene } = useGLTF(url);
  const opacity = partOpacity(part, activePart, viewMode, part === activePart ? activeOpacity : restOpacity);
  const active = part === activePart;

  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);

    const prepareMaterial = (source: Material) => {
      const material = source instanceof MeshStandardMaterial ? source.clone() : new MeshStandardMaterial({ color: tint });
      material.side = DoubleSide;
      material.transparent = opacity < 1 || material.transparent;
      material.opacity = opacity;
      material.depthWrite = opacity > 0.48;

      if (material instanceof MeshStandardMaterial) {
        material.roughness = Math.min(0.82, Math.max(0.32, material.roughness || 0.5));
        material.metalness = Math.min(0.45, Math.max(0.06, material.metalness || 0.08));
        material.envMapIntensity = active ? 0.92 : 0.56;
        material.emissive.set(tint);
        material.emissiveIntensity = active ? 0.06 : 0.015;
        if (!preserveTexture) {
          material.map = null;
          material.color.set(tint);
        }
      }

      material.needsUpdate = true;
      return material;
    };

    clone.traverse((node) => {
      const mesh = node as Mesh;
      if (!mesh.isMesh) {
        return;
      }

      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.material = Array.isArray(mesh.material)
        ? mesh.material.map((material) => prepareMaterial(material))
        : prepareMaterial(mesh.material);
    });

    return clone;
  }, [active, opacity, preserveTexture, scene, tint]);

  return (
    <group position={position} rotation={rotation} scale={scale}>
      <primitive object={clonedScene} />
    </group>
  );
}

function SceneLabel({
  children,
  position,
}: {
  children: string;
  position: [number, number, number];
}) {
  return (
    <Html position={position} center className="scene-label" distanceFactor={8}>
      <span>{children}</span>
    </Html>
  );
}

function RealModelCluster({
  activePart,
  viewMode,
}: {
  activePart: ScenePart;
  viewMode: ViewMode;
}) {
  return (
    <group>
      <SceneLabel position={[0, 1.62, 0]}>实拍 / Tripo 模型组</SceneLabel>
      <LoadedGlbModel
        url={modelAssets.body}
        part="body"
        activePart={activePart}
        viewMode={viewMode}
        tint="#f8fcff"
        activeOpacity={viewMode === "assembled" ? 0.82 : 0.42}
        restOpacity={0.32}
        position={[0, 0.46, -0.18]}
        rotation={[0, Math.PI / 2, 0]}
        scale={[2.45, 2.16, 3.1]}
      />

      <LoadedGlbModel
        url={modelAssets.engine}
        part="drive"
        activePart={activePart}
        viewMode={viewMode}
        tint="#f28c28"
        activeOpacity={0.98}
        restOpacity={0.3}
        position={[-0.82, -0.22, 0.64]}
        rotation={[0, Math.PI / 2, 0]}
        scale={[1.45, 0.78, 0.56]}
        preserveTexture={false}
      />

      <LoadedGlbModel
        url={modelAssets.transmission}
        part="drive"
        activePart={activePart}
        viewMode={viewMode}
        tint="#f28c28"
        activeOpacity={0.96}
        restOpacity={0.3}
        position={[0.86, -0.2, 0.64]}
        rotation={[0.12, -0.55, 0]}
        scale={[0.62, 0.62, 0.62]}
      />

      <CurveTube
        part="drive"
        activePart={activePart}
        viewMode={viewMode}
        color="#ff8f1f"
        opacity={0.62}
        radius={0.014}
        points={[
          [-0.42, -0.16, 0.64],
          [0.05, -0.12, 0.76],
          [0.52, -0.16, 0.66],
        ]}
      />

      <CurveTube
        part="body"
        activePart={activePart}
        viewMode={viewMode}
        color="#0f8fb3"
        opacity={0.48}
        radius={0.01}
        points={[
          [-1.46, 1.03, -0.54],
          [-0.72, 1.28, -0.62],
          [0.42, 1.2, -0.58],
          [1.42, 0.74, -0.5],
        ]}
      />
    </group>
  );
}

function AbstractBodyShell({
  activePart,
  viewMode,
}: {
  activePart: ScenePart;
  viewMode: ViewMode;
}) {
  const shellOpacity = viewMode === "assembled" ? 0.48 : 0.2;

  return (
    <group>
      <RoundedBox args={[5.2, 0.72, 1.72]} radius={0.22} smoothness={12} position={[0, 0.25, 0]}>
        <PartMaterial
          part="body"
          activePart={activePart}
          viewMode={viewMode}
          color="#eff7fb"
          opacity={shellOpacity}
          roughness={0.22}
          metalness={0.12}
        />
        <Edges color={activePart === "body" ? "#0f8fb3" : "#9cc8d5"} />
      </RoundedBox>

      <RoundedBox args={[2.25, 0.78, 1.42]} radius={0.28} smoothness={12} position={[-0.28, 0.82, 0]}>
        <PartMaterial
          part="body"
          activePart={activePart}
          viewMode={viewMode}
          color="#f7fbfd"
          opacity={viewMode === "assembled" ? 0.42 : 0.18}
          roughness={0.18}
          metalness={0.08}
        />
        <Edges color={activePart === "body" ? "#0f8fb3" : "#b5d5dd"} />
      </RoundedBox>

      <RoundedBox args={[1.24, 0.28, 1.5]} radius={0.15} smoothness={10} position={[-2.25, 0.4, 0]}>
        <PartMaterial part="body" activePart={activePart} viewMode={viewMode} color="#f3f8fb" opacity={0.38} />
      </RoundedBox>
      <RoundedBox args={[1.22, 0.26, 1.48]} radius={0.15} smoothness={10} position={[2.16, 0.38, 0]}>
        <PartMaterial part="body" activePart={activePart} viewMode={viewMode} color="#f3f8fb" opacity={0.36} />
      </RoundedBox>

      <CurveTube
        part="body"
        activePart={activePart}
        viewMode={viewMode}
        color="#0f8fb3"
        opacity={0.78}
        radius={0.012}
        points={[
          [-2.45, 0.92, -0.88],
          [-1.32, 1.28, -0.9],
          [0.18, 1.33, -0.9],
          [1.56, 0.98, -0.9],
          [2.46, 0.62, -0.88],
        ]}
      />
      <CurveTube
        part="body"
        activePart={activePart}
        viewMode={viewMode}
        color="#0f8fb3"
        opacity={0.52}
        radius={0.01}
        points={[
          [-2.52, 0.78, 0.88],
          [-1.42, 1.16, 0.9],
          [0.24, 1.22, 0.9],
          [1.52, 0.88, 0.9],
          [2.46, 0.55, 0.88],
        ]}
      />
    </group>
  );
}

function BatteryPack({
  activePart,
  viewMode,
}: {
  activePart: ScenePart;
  viewMode: ViewMode;
}) {
  const cells = Array.from({ length: 24 }, (_, index) => {
    const column = index % 8;
    const row = Math.floor(index / 8);
    return [-1.4 + column * 0.4, -0.12, -0.42 + row * 0.42] as [number, number, number];
  });

  return (
    <group>
      <RoundedBox args={[3.46, 0.18, 1.32]} radius={0.08} smoothness={8} position={[0, -0.16, 0]}>
        <PartMaterial part="battery" activePart={activePart} viewMode={viewMode} color="#dff8fc" opacity={0.86} />
        <Edges color="#11a8c7" />
      </RoundedBox>
      {cells.map((position, index) => (
        <RoundedBox key={index} args={[0.32, 0.08, 0.32]} radius={0.035} smoothness={6} position={position}>
          <PartMaterial
            part="battery"
            activePart={activePart}
            viewMode={viewMode}
            color={index % 2 === 0 ? "#62d7e8" : "#9ee7f0"}
            opacity={0.92}
            roughness={0.38}
          />
        </RoundedBox>
      ))}
      <RoundedBox args={[3.7, 0.08, 1.48]} radius={0.04} smoothness={4} position={[0, -0.31, 0]}>
        <PartMaterial part="battery" activePart={activePart} viewMode={viewMode} color="#41576b" opacity={0.42} />
      </RoundedBox>
    </group>
  );
}

function DriveUnits({
  activePart,
  viewMode,
}: {
  activePart: ScenePart;
  viewMode: ViewMode;
}) {
  const unitPositions: Array<[number, number, number]> = [
    [-2.02, -0.04, 0],
    [1.92, -0.04, 0],
  ];

  return (
    <group>
      {unitPositions.map((position, index) => (
        <group key={index} position={position}>
          <RoundedBox args={[0.64, 0.34, 0.78]} radius={0.08} smoothness={8}>
            <PartMaterial part="drive" activePart={activePart} viewMode={viewMode} color="#e8edf1" opacity={0.92} />
            <Edges color="#f28c28" />
          </RoundedBox>
          <mesh position={[0, 0.03, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.24, 0.24, 0.64, 32]} />
            <PartMaterial part="drive" activePart={activePart} viewMode={viewMode} color="#f28c28" opacity={0.96} />
          </mesh>
          <RoundedBox args={[0.3, 0.22, 0.3]} radius={0.04} smoothness={5} position={[0.34, 0.12, 0.26]}>
            <PartMaterial part="drive" activePart={activePart} viewMode={viewMode} color="#8ec642" opacity={0.94} />
          </RoundedBox>
        </group>
      ))}

      <CurveTube
        part="drive"
        activePart={activePart}
        viewMode={viewMode}
        color="#ff8f1f"
        radius={0.03}
        points={[
          [-1.82, 0.03, 0.18],
          [-1.18, 0.02, 0.52],
          [-0.25, -0.02, 0.58],
          [0.55, -0.02, 0.55],
          [1.68, 0.05, 0.2],
        ]}
      />
      <CurveTube
        part="drive"
        activePart={activePart}
        viewMode={viewMode}
        color="#ff8f1f"
        radius={0.025}
        points={[
          [-1.95, -0.02, -0.32],
          [-0.9, -0.1, -0.58],
          [0.35, -0.11, -0.58],
          [1.76, -0.02, -0.3],
        ]}
      />
    </group>
  );
}

function WheelAssembly({
  x,
  z,
  activePart,
  viewMode,
}: {
  x: number;
  z: number;
  activePart: ScenePart;
  viewMode: ViewMode;
}) {
  const springPoints = useMemo(
    () =>
      Array.from({ length: 36 }, (_, index) => {
        const t = index / 35;
        const angle = t * Math.PI * 7;
        return [
          x + Math.sin(angle) * 0.08,
          0.08 + t * 0.66,
          z + Math.cos(angle) * 0.08,
        ] as [number, number, number];
      }),
    [x, z],
  );

  return (
    <group>
      <mesh position={[x, -0.14, z]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow>
        <torusGeometry args={[0.37, 0.08, 18, 48]} />
        <PartMaterial part="chassis" activePart={activePart} viewMode={viewMode} color="#151d25" opacity={0.96} />
      </mesh>
      <mesh position={[x, -0.14, z]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.24, 0.24, 0.08, 36]} />
        <PartMaterial part="chassis" activePart={activePart} viewMode={viewMode} color="#ccd4dc" opacity={0.98} />
      </mesh>
      <RoundedBox args={[0.1, 0.22, 0.08]} radius={0.03} smoothness={5} position={[x, -0.12, z > 0 ? z - 0.2 : z + 0.2]}>
        <PartMaterial part="chassis" activePart={activePart} viewMode={viewMode} color="#f2a51f" opacity={0.98} />
      </RoundedBox>
      <CurveTube
        part="chassis"
        activePart={activePart}
        viewMode={viewMode}
        color="#4b5f76"
        radius={0.018}
        points={springPoints}
      />
      <CurveTube
        part="chassis"
        activePart={activePart}
        viewMode={viewMode}
        color="#66778a"
        radius={0.022}
        points={[
          [x, 0.1, z],
          [x * 0.78, -0.08, z * 0.58],
          [x * 0.55, -0.16, z * 0.26],
        ]}
      />
    </group>
  );
}

function Chassis({
  activePart,
  viewMode,
}: {
  activePart: ScenePart;
  viewMode: ViewMode;
}) {
  return (
    <group>
      {[-0.68, 0.68].map((z) => (
        <RoundedBox key={z} args={[4.45, 0.08, 0.08]} radius={0.025} smoothness={4} position={[0, -0.24, z]}>
          <PartMaterial part="chassis" activePart={activePart} viewMode={viewMode} color="#53677b" opacity={0.72} />
        </RoundedBox>
      ))}
      {[-1.7, 1.7].map((x) => (
        <RoundedBox key={x} args={[0.12, 0.08, 1.5]} radius={0.025} smoothness={4} position={[x, -0.22, 0]}>
          <PartMaterial part="chassis" activePart={activePart} viewMode={viewMode} color="#53677b" opacity={0.72} />
        </RoundedBox>
      ))}
      {[-1.75, 1.75].flatMap((x) =>
        [-0.92, 0.92].map((z) => (
          <WheelAssembly key={`${x}-${z}`} x={x} z={z} activePart={activePart} viewMode={viewMode} />
        )),
      )}
    </group>
  );
}

function AdasSensors({
  activePart,
  viewMode,
}: {
  activePart: ScenePart;
  viewMode: ViewMode;
}) {
  return (
    <group>
      <mesh position={[-0.1, 1.46, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.19, 0.2, 0.14, 36]} />
        <PartMaterial part="adas" activePart={activePart} viewMode={viewMode} color="#1fb66f" opacity={0.96} />
      </mesh>
      <RoundedBox args={[0.56, 0.12, 0.16]} radius={0.04} smoothness={5} position={[-0.85, 1.18, -0.03]}>
        <PartMaterial part="adas" activePart={activePart} viewMode={viewMode} color="#203744" opacity={0.96} />
      </RoundedBox>
      {[
        [-2.62, 0.36, 0],
        [-0.62, 0.64, -0.9],
        [-0.62, 0.64, 0.9],
        [2.42, 0.56, -0.72],
        [2.42, 0.56, 0.72],
      ].map((position, index) => (
        <mesh key={index} position={position as [number, number, number]} castShadow receiveShadow>
          <sphereGeometry args={[0.08, 20, 20]} />
          <PartMaterial part="adas" activePart={activePart} viewMode={viewMode} color="#20b66f" opacity={0.95} />
        </mesh>
      ))}
      {[0, 1, 2].map((index) => (
        <CurveTube
          key={index}
          part="adas"
          activePart={activePart}
          viewMode={viewMode}
          color="#20b66f"
          opacity={0.42}
          radius={0.008}
          points={[
            [-0.1, 1.5, 0],
            [0.45 + index * 0.16, 1.68 + index * 0.04, 0.16 - index * 0.16],
            [1.45 + index * 0.32, 1.44, 0.44 - index * 0.44],
          ]}
        />
      ))}
    </group>
  );
}

function Cockpit({
  activePart,
  viewMode,
}: {
  activePart: ScenePart;
  viewMode: ViewMode;
}) {
  const seats: Array<[number, number, number]> = [
    [-0.55, 0.42, -0.34],
    [-0.55, 0.42, 0.34],
    [0.45, 0.36, -0.34],
    [0.45, 0.36, 0.34],
  ];

  return (
    <group>
      {seats.map((position, index) => (
        <group key={index} position={position}>
          <RoundedBox args={[0.28, 0.38, 0.24]} radius={0.06} smoothness={7}>
            <PartMaterial part="cockpit" activePart={activePart} viewMode={viewMode} color="#d8dce8" opacity={0.86} />
          </RoundedBox>
          <RoundedBox args={[0.24, 0.42, 0.22]} radius={0.05} smoothness={7} position={[0.08, 0.26, 0]}>
            <PartMaterial part="cockpit" activePart={activePart} viewMode={viewMode} color="#b9c0d4" opacity={0.82} />
          </RoundedBox>
        </group>
      ))}
      <RoundedBox args={[0.1, 0.42, 0.62]} radius={0.04} smoothness={5} position={[-1.0, 0.72, 0]}>
        <PartMaterial part="cockpit" activePart={activePart} viewMode={viewMode} color="#101b2a" opacity={0.92} />
      </RoundedBox>
      <RoundedBox args={[0.08, 0.32, 0.5]} radius={0.04} smoothness={5} position={[-0.92, 0.72, -0.16]}>
        <PartMaterial part="cockpit" activePart={activePart} viewMode={viewMode} color="#7c5cff" opacity={0.72} />
      </RoundedBox>
      <mesh position={[-1.18, 0.52, -0.28]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <torusGeometry args={[0.13, 0.014, 10, 32]} />
        <PartMaterial part="cockpit" activePart={activePart} viewMode={viewMode} color="#1d2835" opacity={0.96} />
      </mesh>
    </group>
  );
}

function VehicleModel({
  activeModuleId,
  viewMode,
  autoRotate,
}: Omit<VehicleSceneProps, "resetKey">) {
  const group = useRef<Group>(null);
  const activePart = getVehicleModuleById(activeModuleId).scenePart;

  useFrame((_, delta) => {
    if (group.current && autoRotate) {
      group.current.rotation.y += delta * 0.08;
    }
  });

  return (
    <group ref={group} rotation={[0.02, -0.2, 0]} position={[0, -0.12, 0]}>
      <group position={[-2.35, 0.02, 0]}>
        <RealModelCluster activePart={activePart} viewMode={viewMode} />
      </group>

      <group position={[2.2, -0.04, 0]} scale={[0.62, 0.62, 0.62]}>
        <SceneLabel position={[0, 1.88, 0]}>抽象结构示意</SceneLabel>
        <AbstractBodyShell activePart={activePart} viewMode={viewMode} />
        <BatteryPack activePart={activePart} viewMode={viewMode} />
        <DriveUnits activePart={activePart} viewMode={viewMode} />
        <Chassis activePart={activePart} viewMode={viewMode} />
        <AdasSensors activePart={activePart} viewMode={viewMode} />
        <Cockpit activePart={activePart} viewMode={viewMode} />
      </group>
    </group>
  );
}

export function VehicleScene({ activeModuleId, viewMode, autoRotate, resetKey }: VehicleSceneProps) {
  return (
    <Canvas
      key={resetKey}
      className="vehicle-canvas"
      dpr={[1, 2]}
      shadows
      gl={{ antialias: true, alpha: true, premultipliedAlpha: false }}
      camera={{ position: [0, 1.32, 7.4], fov: 38 }}
    >
      <color attach="background" args={["#ffffff"]} />
      <ambientLight intensity={1.4} />
      <hemisphereLight args={["#ffffff", "#dce7ee", 1.18]} />
      <directionalLight position={[4.5, 5.6, 5.2]} intensity={2.8} castShadow />
      <directionalLight position={[-4.2, 2.4, -3.8]} intensity={0.85} color="#d7f8ff" />
      <pointLight position={[1.8, 0.6, 3.4]} intensity={0.72} color="#11a8c7" />
      <Suspense fallback={null}>
        <Float speed={1.08} rotationIntensity={0.04} floatIntensity={0.06}>
          <VehicleModel activeModuleId={activeModuleId} viewMode={viewMode} autoRotate={autoRotate} />
        </Float>
      </Suspense>
      <gridHelper args={[9.6, 24, "#d9eef4", "#edf4f7"]} position={[0, -0.68, 0]} />
      <ContactShadows position={[0, -0.66, 0]} opacity={0.2} scale={9.2} blur={3} far={3.8} />
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        enablePan
        minDistance={4.6}
        maxDistance={10.2}
      />
    </Canvas>
  );
}

useGLTF.preload(modelAssets.body);
useGLTF.preload(modelAssets.engine);
useGLTF.preload(modelAssets.transmission);
