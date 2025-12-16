
import React, { useRef } from 'react';
import { GestureType } from '../types';

interface UIOverlayProps {
  currentGesture: GestureType;
  isHandDetected: boolean;
  cameraStatus: 'loading' | 'active' | 'error' | 'idle';
  cameraError?: string;
  onStartCamera: () => void;
  onStopCamera: () => void;
  onScreenshot: () => void;
  onUploadImage: (file: File) => void;
}

const UIOverlay: React.FC<UIOverlayProps> = ({ 
  currentGesture, 
  isHandDetected, 
  cameraStatus, 
  cameraError, 
  onStartCamera,
  onStopCamera,
  onScreenshot,
  onUploadImage
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onUploadImage(file);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const getStatusText = () => {
    if (cameraStatus === 'error') return "摄像头错误";
    if (cameraStatus === 'idle' || cameraStatus === 'loading') return "正在初始化...";
    if (!isHandDetected) return "寻找手势...";
    
    switch (currentGesture) {
      case GestureType.CLOSED_FIST: return "状态: 聚合";
      case GestureType.OPEN_PALM: return "状态: 散开";
      case GestureType.PINCH: return "状态: 聚焦";
      default: return "就绪";
    }
  };

  const getStatusColor = () => {
    if (cameraStatus === 'error') return "text-red-400";
    switch (currentGesture) {
      case GestureType.CLOSED_FIST: return "text-pink-400 drop-shadow-[0_0_8px_rgba(244,114,182,0.8)]";
      case GestureType.OPEN_PALM: return "text-purple-400 drop-shadow-[0_0_8px_rgba(192,132,252,0.8)]";
      case GestureType.PINCH: return "text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]";
      default: return "text-gray-300";
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 z-40">
      
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
        style={{ display: 'none' }}
      />

      {/* --- Top Bar: Title & Actions --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pointer-events-auto gap-4">
        {/* Title */}
        <div className="flex flex-col">
           <h1 className="cinematic-text text-3xl md:text-4xl text-transparent bg-clip-text bg-gradient-to-r from-pink-200 via-purple-300 to-indigo-200 drop-shadow-[0_0_15px_rgba(238,130,238,0.5)] font-bold tracking-widest uppercase">
             粒子记忆
           </h1>
           <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-pink-500 to-transparent mt-1"></div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3">
             {/* Upload Button */}
             <button
                onClick={triggerFileUpload}
                className="group flex items-center justify-center h-10 px-4 rounded-full bg-blue-500/10 hover:bg-blue-500/30 border border-blue-500/30 backdrop-blur-md transition-all duration-300 text-blue-200 shadow-lg hover:shadow-blue-500/20 text-xs uppercase tracking-widest"
                title="上传照片"
             >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                上传照片
             </button>

             {/* Screenshot Button */}
             <button
                onClick={onScreenshot}
                className="group flex items-center justify-center w-10 h-10 rounded-full bg-white/5 hover:bg-white/20 border border-white/10 backdrop-blur-md transition-all duration-300 text-white shadow-lg hover:shadow-pink-500/20"
                title="截图保存"
             >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-active:scale-90 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
             </button>

             {/* Stop Camera Button (Only if active) */}
             {cameraStatus === 'active' && (
                 <button
                    onClick={onStopCamera}
                    className="group flex items-center justify-center w-10 h-10 rounded-full bg-red-500/10 hover:bg-red-500/30 border border-red-500/30 backdrop-blur-md transition-all duration-300 text-red-300 shadow-lg hover:shadow-red-500/20"
                    title="关闭摄像头"
                 >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-active:scale-90 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                 </button>
             )}
        </div>
      </div>

      {/* --- Center: Main CTA (If idle) --- */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center w-full max-w-md px-4 pointer-events-auto">
        {(cameraStatus === 'idle' || cameraStatus === 'error') && (
           <div className="flex flex-col items-center space-y-6 animate-fadeIn">
               {cameraStatus === 'error' && (
                 <div className="flex items-center space-x-2 text-red-300 bg-red-900/50 border border-red-500/30 px-4 py-2 rounded-lg backdrop-blur-sm">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    <span>{cameraError || "权限拒绝或未知错误"}</span>
                 </div>
               )}
               
               <button 
                onClick={onStartCamera}
                className="group relative px-10 py-4 overflow-hidden rounded-xl bg-gradient-to-r from-purple-900/80 to-pink-900/80 border border-pink-500/40 shadow-[0_0_30px_rgba(236,72,153,0.3)] hover:shadow-[0_0_50px_rgba(236,72,153,0.5)] transition-all duration-500"
               >
                 <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-purple-600 opacity-0 group-hover:opacity-20 transition-opacity duration-500"></div>
                 <span className="relative z-10 flex items-center space-x-3 text-white font-cinzel text-xl tracking-wider">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span>开启体验</span>
                 </span>
               </button>
               
               <p className="text-gray-400 text-sm font-light tracking-wide">
                 启用摄像头以使用手势交互
               </p>
           </div>
        )}

        {cameraStatus === 'active' && !isHandDetected && (
          <div className="flex flex-col items-center space-y-2 animate-pulse pointer-events-none">
            <div className="w-16 h-16 rounded-full border border-white/20 bg-white/5 flex items-center justify-center">
                 <svg className="w-8 h-8 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" /></svg>
            </div>
            <p className="text-white/80 font-light text-lg tracking-widest uppercase text-shadow-sm">
               请展示手掌
            </p>
          </div>
        )}
      </div>

      {/* --- Bottom Bar: Controls & Status --- */}
      <div className="pointer-events-auto bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-5 md:p-6 flex flex-col md:flex-row justify-between items-center gap-6 shadow-2xl">
        
        {/* Controls Legend */}
        <div className="flex flex-col space-y-3 w-full md:w-auto">
          <p className="cinematic-text text-gray-400 text-xs uppercase tracking-[0.2em] border-b border-white/10 pb-2 mb-1">
            手势指南
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
             <div className="flex items-center space-x-3 group cursor-help" title="握紧拳头以聚合粒子">
                <span className="w-3 h-3 rounded-full bg-pink-500 shadow-[0_0_12px_#ec4899] group-hover:scale-125 transition-transform"></span>
                <span className="text-gray-300 text-sm font-light">握拳 <span className="text-gray-500 text-xs ml-1">聚合</span></span>
             </div>
             <div className="flex items-center space-x-3 group cursor-help" title="张开手掌以散开粒子">
                <span className="w-3 h-3 rounded-full bg-purple-500 shadow-[0_0_12px_#a855f7] group-hover:scale-125 transition-transform"></span>
                <span className="text-gray-300 text-sm font-light">张开 <span className="text-gray-500 text-xs ml-1">散开</span></span>
             </div>
             <div className="flex items-center space-x-3 group cursor-help" title="捏合手指以聚焦">
                <span className="w-3 h-3 rounded-full bg-white shadow-[0_0_12px_#ffffff] group-hover:scale-125 transition-transform"></span>
                <span className="text-gray-300 text-sm font-light">捏合 <span className="text-gray-500 text-xs ml-1">聚焦</span></span>
             </div>
             <div className="flex items-center space-x-3 group cursor-help" title="移动手掌以旋转视角">
                <span className="w-3 h-3 rounded-full bg-gray-500 shadow-[0_0_12px_#6b7280] group-hover:scale-125 transition-transform"></span>
                <span className="text-gray-300 text-sm font-light">移动 <span className="text-gray-500 text-xs ml-1">旋转</span></span>
             </div>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="flex flex-col items-end min-w-[150px] border-l border-white/10 pl-6 h-full justify-center">
           <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">系统状态</p>
           <p className={`cinematic-text text-lg md:text-xl font-bold transition-all duration-300 ${getStatusColor()}`}>
             {getStatusText()}
           </p>
        </div>
      </div>
    </div>
  );
};

export default UIOverlay;
