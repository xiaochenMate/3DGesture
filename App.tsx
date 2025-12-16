
import React, { useState, useCallback, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Loader } from '@react-three/drei';
import Experience from './components/Experience';
import HandTracker from './components/HandTracker';
import UIOverlay from './components/UIOverlay';
import { GestureType, HandData } from './types';
import { COLORS, TARGET_IMAGE_URL } from './constants';

function App() {
  // 1. Reactive State
  const [currentGesture, setCurrentGesture] = useState<GestureType>(GestureType.NONE);
  const [isHandDetected, setIsHandDetected] = useState(false);
  const [imageSource, setImageSource] = useState<string>(TARGET_IMAGE_URL);
  
  // 2. Mutable Ref (Animation/Physics)
  const handDataRef = useRef<HandData>({
    gesture: GestureType.NONE,
    x: 0.5,
    y: 0.5,
    isDetected: false
  });
  
  const [cameraStatus, setCameraStatus] = useState<'loading' | 'active' | 'error' | 'idle'>('idle');
  const [cameraError, setCameraError] = useState<string | undefined>();
  const [shouldStartCamera, setShouldStartCamera] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Callback optimized to only update state when necessary
  const handleHandUpdate = useCallback((data: HandData) => {
    handDataRef.current = data;
    setCurrentGesture(prev => prev !== data.gesture ? data.gesture : prev);
    setIsHandDetected(prev => prev !== data.isDetected ? data.isDetected : prev);
  }, []);

  const handleCameraStatusChange = useCallback((status: 'loading' | 'active' | 'error', message?: string) => {
    setCameraStatus(status);
    if (status === 'error') {
        setCameraError(message);
        setShouldStartCamera(false); // Reset trigger on error
    }
  }, []);

  const triggerCameraStart = () => {
      setShouldStartCamera(true);
  };

  const triggerCameraStop = () => {
      setShouldStartCamera(false);
      setCameraStatus('idle');
      setIsHandDetected(false);
      handDataRef.current = { gesture: GestureType.NONE, x: 0.5, y: 0.5, isDetected: false };
      setCurrentGesture(GestureType.NONE);
  };

  const handleScreenshot = () => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const link = document.createElement('a');
      link.setAttribute('download', 'particle-memory.png');
      link.setAttribute('href', canvas.toDataURL('image/png').replace('image/png', 'image/octet-stream'));
      link.click();
    }
  };

  const handleImageUpload = (file: File) => {
      const objectUrl = URL.createObjectURL(file);
      setImageSource(objectUrl);
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden select-none">
      
      {/* 1. 3D Scene Layer */}
      <div className="absolute inset-0 z-10">
        <Canvas
          dpr={[1, 2]} 
          gl={{ 
            antialias: false, 
            toneMapping: 3,
            preserveDrawingBuffer: true // Required for screenshot
          }} 
          shadows
          ref={canvasRef}
        >
          <color attach="background" args={[COLORS.BG_DARK]} />
          <fog attach="fog" args={[COLORS.BG_DARK, 10, 50]} />
          
          <Experience 
            handDataRef={handDataRef} 
            currentGesture={currentGesture}
            isHandDetected={isHandDetected}
            imageSource={imageSource}
          />
        </Canvas>
      </div>

      {/* 2. UI & Instruction Layer */}
      <UIOverlay 
        currentGesture={currentGesture}
        isHandDetected={isHandDetected}
        cameraStatus={cameraStatus}
        cameraError={cameraError}
        onStartCamera={triggerCameraStart}
        onStopCamera={triggerCameraStop}
        onScreenshot={handleScreenshot}
        onUploadImage={handleImageUpload}
      />

      {/* 3. Logic Layer */}
      <HandTracker 
        onHandUpdate={handleHandUpdate} 
        onCameraStatusChange={handleCameraStatusChange}
        shouldStart={shouldStartCamera}
      />
      
      {/* 4. Loader */}
      <Loader 
        containerStyles={{ background: 'black' }} 
        innerStyles={{ width: '200px', background: '#333' }} 
        barStyles={{ background: COLORS.METALLIC_GOLD }}
        dataStyles={{ color: COLORS.WARM_WHITE, fontFamily: 'Cinzel' }}
      />
    </div>
  );
}

export default App;
