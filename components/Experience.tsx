
import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Html, Stars } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { GestureType, HandData, PointCloudData } from '../types';
import { generateParticlesFromImage } from '../utils/geometry';
import { CONFIG } from '../constants';

interface ExperienceProps {
  handDataRef: React.MutableRefObject<HandData>;
  currentGesture: GestureType;
  isHandDetected: boolean;
  imageSource: string;
}

const PhotoParticles: React.FC<{ 
  handDataRef: React.MutableRefObject<HandData>,
  currentGesture: GestureType,
  imageSource: string
}> = ({ handDataRef, currentGesture, imageSource }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const [data, setData] = useState<PointCloudData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Physics State
  const transitionProgress = useRef(0);
  const swayVector = useRef(new THREE.Vector3());
  const vortexAngleRef = useRef(0);      
  const velocityRef = useRef(0);         
  const prevHandPosRef = useRef({ x: 0.5, y: 0.5 }); 
  const wasDetectedRef = useRef(false);

  // Reusable objects
  const colorTemp = useMemo(() => new THREE.Color(), []);
  const colorBase = useMemo(() => new THREE.Color(), []);

  // Init Data
  useEffect(() => {
    let active = true;
    setLoading(true);
    
    generateParticlesFromImage(imageSource).then((res) => {
      if (active) {
        setData(res);
        setLoading(false);
        // Reset state
        transitionProgress.current = 0;
        velocityRef.current = 0;
        vortexAngleRef.current = 0;
        swayVector.current.set(0,0,0);
      }
    });
    return () => { active = false; };
  }, [imageSource]);

  // **CRITICAL FIX**: Create separate working buffers for the GPU.
  // This ensures we do not mutate the original `data` source in the animation loop.
  // If we modify `data.colors` directly (via reference), the brightness accumulates frame over frame (0.5 -> 0.6 -> 0.7 ... -> White).
  const { workingPositions, workingColors, workingSizes } = useMemo(() => {
      if (!data) return { workingPositions: null, workingColors: null, workingSizes: null };
      return {
          workingPositions: new Float32Array(data.positions), // Clone
          workingColors: new Float32Array(data.colors),       // Clone (Vital for color stability)
          workingSizes: new Float32Array(data.sizes)          // Clone
      };
  }, [data]);

  useFrame((state, delta) => {
    if (!data || !pointsRef.current) return;
    
    // 1. Safety Clamp Delta
    const safeDelta = Math.min(delta, 0.05); 
    const time = state.clock.elapsedTime;
    
    const geo = pointsRef.current.geometry;
    const posAttr = geo.attributes.position as THREE.BufferAttribute;
    const colAttr = geo.attributes.color as THREE.BufferAttribute;
    const sizeAttr = geo.attributes.size as THREE.BufferAttribute;
    
    const hand = handDataRef.current;

    // --- 2. GESTURE LOGIC ---
    let targetT = 0.0;
    
    // Logic: 
    // Open Palm -> Scatter (1.0)
    // Closed Fist / None -> Return to Photo (0.0)
    if (currentGesture === GestureType.OPEN_PALM) {
        targetT = 1.0;
    } else {
        targetT = 0.0;
    }
    
    const lerpSpeed = targetT > 0.5 ? 1.5 : 2.5;
    transitionProgress.current = THREE.MathUtils.lerp(transitionProgress.current, targetT, safeDelta * lerpSpeed);
    
    if (transitionProgress.current < 0.001) transitionProgress.current = 0;
    const t = transitionProgress.current;

    // --- 3. VELOCITY & HAND TRACKING ---
    let targetVelocity = 0;
    
    if (hand.isDetected) {
        if (!wasDetectedRef.current) {
            prevHandPosRef.current = { x: hand.x, y: hand.y };
            targetVelocity = 0; 
        } else {
            const dx = hand.x - prevHandPosRef.current.x;
            const dy = hand.y - prevHandPosRef.current.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            // Speed calculation
            let handSpeed = dist / safeDelta;
            handSpeed = Math.min(handSpeed, 5.0); 

            // If hand is moving, velocity goes up.
            // If hand is still (dist ~ 0), targetVelocity becomes 0.
            targetVelocity = handSpeed * 1.5; 
            
            prevHandPosRef.current = { x: hand.x, y: hand.y };
        }
    } else {
        targetVelocity = 0;
    }
    wasDetectedRef.current = hand.isDetected;

    // Lerp Velocity (Inertia/Friction)
    // If target is lower (hand stopped), decay faster (Higher friction)
    const velocityLerpFactor = targetVelocity < velocityRef.current ? 4.0 : 2.0; 
    velocityRef.current = THREE.MathUtils.lerp(velocityRef.current, targetVelocity, safeDelta * velocityLerpFactor);
    
    // Kill extremely small velocity to stop micro-jitter
    if (velocityRef.current < 0.01) velocityRef.current = 0;
    
    // Safety cap
    if (velocityRef.current > 3.0) velocityRef.current = 3.0;
    if (isNaN(velocityRef.current)) velocityRef.current = 0;

    // Only rotate vortex if there is actual velocity
    vortexAngleRef.current += velocityRef.current * safeDelta;

    // --- 4. SWAY / FOLLOW HAND ---
    let targetSwayX = 0;
    let targetSwayY = 0;

    if (hand.isDetected) {
        if (t > 0.1) {
            targetSwayX = (hand.x - 0.5) * 25; 
            targetSwayY = -(hand.y - 0.5) * 25;
        }
    }
    
    swayVector.current.x = THREE.MathUtils.lerp(swayVector.current.x, targetSwayX, safeDelta * 3);
    swayVector.current.y = THREE.MathUtils.lerp(swayVector.current.y, targetSwayY, safeDelta * 3);

    // --- 5. PARTICLE UPDATE LOOP ---
    const count = data.positions.length / 3;
    const smoothT = THREE.MathUtils.smoothstep(t, 0, 1);
    
    for(let i=0; i<count; i++) {
        const i3 = i * 3;
        
        // 1. Base Image Position (Read from immutable data)
        const dx = data.targetTree[i3];
        const dy = data.targetTree[i3+1];
        const dz = data.targetTree[i3+2];

        // 2. Galaxy Position
        const cx = data.targetCloud[i3];
        const cy = data.targetCloud[i3+1];
        const cz = data.targetCloud[i3+2];

        // 3. Interpolate
        let px = dx + (cx - dx) * smoothT;
        let py = dy + (cy - dy) * smoothT;
        let pz = dz + (cz - dz) * smoothT;

        // 4. Vortex Physics
        if (smoothT > 0.01) {
            px += swayVector.current.x * smoothT;
            py += swayVector.current.y * smoothT;

            if (velocityRef.current > 0.01) {
                const dist = Math.sqrt(px*px + pz*pz);
                const angle = vortexAngleRef.current - (dist * 0.05); 
                
                const cosA = Math.cos(angle);
                const sinA = Math.sin(angle);
                
                const rx = px * cosA - pz * sinA;
                const rz = px * sinA + pz * cosA;
                
                px = px + (rx - px) * smoothT * 0.8;
                pz = pz + (rz - pz) * smoothT * 0.8;
            }

            const jitterAmt = velocityRef.current * 0.3 * smoothT; 
            if (jitterAmt > 0.01) {
                px += (Math.random() - 0.5) * jitterAmt;
                py += (Math.random() - 0.5) * jitterAmt;
                pz += (Math.random() - 0.5) * jitterAmt;
            }
        } else {
            // Breathing when formed
            const breath = Math.sin(time * 1.5 + dx * 0.5) * 0.05;
            pz += breath; 
        }

        // Safety Bounds
        if (!Number.isFinite(px) || Math.abs(px) > 200) px = dx;
        if (!Number.isFinite(py) || Math.abs(py) > 200) py = dy;
        if (!Number.isFinite(pz) || Math.abs(pz) > 200) pz = dz;

        posAttr.setXYZ(i, px, py, pz);

        // --- 6. COLOR LOGIC (FIXED) ---
        // Always read from original `data.colors` (Source of Truth)
        // Never read from `colAttr` or a buffer we just modified
        colorBase.setRGB(data.colors[i3], data.colors[i3+1], data.colors[i3+2]);
        colorTemp.copy(colorBase);

        // Bloom/Sparkle
        // Only apply if moving and scattered
        const isSparkle = i % 10 === 0;
        if (isSparkle && smoothT > 0.1 && velocityRef.current > 0.1) {
            let boost = velocityRef.current * smoothT;
            boost = Math.min(boost, 1.2); // Gentle boost cap
            
            // Additive boost creates the white sparkle
            colorTemp.r += boost;
            colorTemp.g += boost;
            colorTemp.b += boost;
        }
        
        // Write to the GPU buffer
        colAttr.setXYZ(i, colorTemp.r, colorTemp.g, colorTemp.b);
        
        // Size
        let s = data.sizes[i];
        if (smoothT > 0.1 && velocityRef.current > 0.1) {
             s *= (1 + velocityRef.current * 0.5);
        }
        sizeAttr.setX(i, s);
    }
    
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
  });

  if (loading || !data || !workingPositions) {
     return (
        <Html center>
            <div className="text-pink-300 font-cinzel text-xl animate-pulse whitespace-nowrap drop-shadow-[0_0_10px_rgba(255,182,193,0.8)]" style={{ color: '#F9A8D4' }}>
                正在读取记忆...
            </div>
        </Html>
     );
  }

  return (
    <points ref={pointsRef}>
        <bufferGeometry>
            {/* 
               Pass the CLONED buffers (working*) to the geometry. 
               This prevents R3F from using the original `data.*` arrays as the buffers.
            */}
            <bufferAttribute
                attach="attributes-position"
                count={workingPositions.length / 3}
                array={workingPositions}
                itemSize={3}
            />
            <bufferAttribute
                attach="attributes-color"
                count={workingColors!.length / 3}
                array={workingColors}
                itemSize={3}
            />
            <bufferAttribute
                attach="attributes-size"
                count={workingSizes!.length}
                array={workingSizes}
                itemSize={1}
            />
        </bufferGeometry>
        <pointsMaterial 
            size={0.15} 
            vertexColors 
            transparent 
            opacity={0.9} 
            sizeAttenuation 
            blending={THREE.AdditiveBlending}
            depthWrite={false}
        />
    </points>
  );
};

const Experience: React.FC<ExperienceProps> = ({ handDataRef, currentGesture, isHandDetected, imageSource }) => {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);

  useFrame((state, delta) => {
    if (cameraRef.current) {
      const isPinch = handDataRef.current.gesture === GestureType.PINCH;
      const isExploding = handDataRef.current.gesture === GestureType.OPEN_PALM;
      
      let targetZ = CONFIG.CAMERA_Z_NORMAL;
      if (isPinch) targetZ = CONFIG.CAMERA_Z_ZOOM;
      if (isExploding) targetZ = CONFIG.CAMERA_Z_NORMAL + 8;

      const safeDelta = Math.min(delta, 0.1);
      cameraRef.current.position.z = THREE.MathUtils.lerp(cameraRef.current.position.z, targetZ, safeDelta * 1.5);
    }
  });

  return (
    <>
      <PerspectiveCamera ref={cameraRef} makeDefault position={[0, 0, CONFIG.CAMERA_Z_NORMAL]} fov={60} />
      <OrbitControls enableZoom={false} enablePan={false} enableRotate={false} />

      <ambientLight intensity={0.5} />
      
      <Stars radius={150} depth={50} count={5000} factor={4} saturation={0} fade speed={0.5} />
      
      <PhotoParticles 
        handDataRef={handDataRef} 
        currentGesture={currentGesture}
        imageSource={imageSource}
      />

      <EffectComposer enableNormalPass={false}>
        <Bloom luminanceThreshold={0.2} mipmapBlur intensity={1.2} radius={0.5} />
      </EffectComposer>
    </>
  );
};

export default Experience;
