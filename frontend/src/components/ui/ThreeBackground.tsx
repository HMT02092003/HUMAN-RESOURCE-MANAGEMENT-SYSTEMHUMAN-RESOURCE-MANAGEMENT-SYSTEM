'use client';

import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshTransmissionMaterial, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

// Cấu hình vật liệu kính "xịn"
const glassMaterialConfig = {
  transmission: 1, // Độ trong suốt (1 = như kính)
  thickness: 1.5, // Độ dày của kính (tạo khúc xạ)
  roughness: 0.1, // Độ nhám (0 = bóng loáng, 0.4 = kính mờ)
  chromaticAberration: 0.06, // Hiệu ứng tán sắc (cầu vồng ở viền) -> tạo cảm giác 3D rất thật
  ior: 1.5, // Chỉ số khúc xạ (1.5 = thủy tinh)
  resolution: 1024, // Độ phân giải phản chiếu
  backside: true,
  // MeshTransmissionMaterialProps also expect distortionScale and temporalDistortion
  distortionScale: 0.0,
  temporalDistortion: 0.0,
};

function Geometrics() {
  const torusRef = useRef<THREE.Mesh>(null!);
  const diamondRef = useRef<THREE.Mesh>(null!);

  useFrame((state: any, delta: number) => {
    // Xoay các khối theo thời gian
    torusRef.current.rotation.x += delta * 0.2;
    torusRef.current.rotation.y += delta * 0.1;
    
    diamondRef.current.rotation.x -= delta * 0.2;
    diamondRef.current.rotation.y -= delta * 0.1;

    // Tương tác chuột: Nghiêng nhẹ cả hệ thống theo chuột
    const x = state.pointer.x * 0.2;
    const y = state.pointer.y * 0.2;
    state.camera.position.x += (x - state.camera.position.x) * delta;
    state.camera.position.y += (y - state.camera.position.y) * delta;
    state.camera.lookAt(0, 0, 0);
  });

  return (
    <>
      {/* KHỐI 1: Vòng tròn kính (Torus) - Góc trái trên */}
      <Float floatIntensity={2} speed={2}>
        <mesh ref={torusRef} position={[-3, 1, -2]} scale={1.8}>
          <torusGeometry args={[1, 0.4, 16, 100]} />
          <MeshTransmissionMaterial {...glassMaterialConfig} color="#60a5fa" /> {/* Màu xanh dương nhạt */}
        </mesh>
      </Float>

      {/* KHỐI 2: Viên kim cương (Icosahedron) - Góc phải dưới */}
      <Float floatIntensity={2} speed={1.5} rotationIntensity={1.5}>
        <mesh ref={diamondRef} position={[3, -1, -1]} scale={2}>
          <icosahedronGeometry args={[1, 0]} /> {/* args=[1, 0] tạo hình khối đa diện sắc cạnh */}
          <MeshTransmissionMaterial {...glassMaterialConfig} color="#3b82f6" /> {/* Màu xanh dương đậm */}
        </mesh>
      </Float>

      {/* KHỐI 3: Khối nhỏ trang trí - Ở xa */}
      <Float floatIntensity={1} speed={1}>
        <mesh position={[1, 3, -5]} scale={1}>
          <octahedronGeometry />
          <MeshTransmissionMaterial {...glassMaterialConfig} color="#cbd5e1" />
        </mesh>
      </Float>
    </>
  );
}

export default function ThreeBackground() {
  return (
    <div className="fixed inset-0 z-0 w-full h-full bg-slate-50"> {/* Nền xám rất nhạt để làm nổi bật kính */}
      <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
        {/* Ánh sáng quan trọng để kính đẹp */}
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={2} castShadow />
        
        {/* Môi trường phản chiếu (Environment): Tạo ra các vệt sáng trên kính */}
        <Environment preset="city" />

        <Geometrics />

        {/* Bóng đổ dưới sàn */}
        <ContactShadows position={[0, -3.5, 0]} opacity={0.5} scale={20} blur={2} far={4.5} />
      </Canvas>
    </div>
  );
}

