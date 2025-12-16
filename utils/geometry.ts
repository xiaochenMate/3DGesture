
import * as THREE from 'three';
import { CONFIG, COLORS } from '../constants';
import { PointCloudData } from '../types';

export const generateParticlesFromImage = async (imageUrl: string): Promise<PointCloudData> => {
  return new Promise((resolve) => {
    const img = new Image();
    
    // Only set crossOrigin for remote URLs, not local blobs or data URIs
    if (!imageUrl.startsWith('blob:') && !imageUrl.startsWith('data:')) {
        img.crossOrigin = "Anonymous";
    }

    // This function creates the Galaxy/Vortex shape (The Target)
    const generateGalaxyShape = (index: number, total: number) => {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 30 + 5; 
        const spiralOffset = radius * 0.5;
        
        // Galaxy Arms (3 Arms)
        const armOffset = (Math.floor(Math.random() * 3) * (Math.PI * 2)) / 3;
        const finalAngle = angle + spiralOffset + armOffset;

        const x = Math.cos(finalAngle) * radius;
        const z = Math.sin(finalAngle) * radius;
        const y = (Math.random() - 0.5) * (10 + radius * 0.2); 

        return { x, y, z };
    };

    const generateAll = (width: number, height: number, ctx?: CanvasRenderingContext2D) => {
        // We use the exact pixel count if image is loaded, otherwise fallback to CONFIG
        const validCount = (width > 0 && height > 0) ? width * height : CONFIG.PARTICLE_COUNT;
        
        const positions = new Float32Array(validCount * 3);
        const targetTree = new Float32Array(validCount * 3);  // Image Shape
        const targetCloud = new Float32Array(validCount * 3); // Galaxy Shape
        const colors = new Float32Array(validCount * 3);
        const sizes = new Float32Array(validCount);

        // Retrieve pixel data if context exists
        let imgData: Uint8ClampedArray | null = null;
        if (ctx && width > 0) {
            try {
                imgData = ctx.getImageData(0, 0, width, height).data;
            } catch (e) {
                console.warn("Canvas tainted, falling back to procedural generation");
                imgData = null;
            }
        }

        // Grid parameters for Image reconstruction
        const ASPECT = width > 0 ? width / height : 0.6; // Default portrait aspect
        const SCALE_Y = 18; // Height of the character in 3D world
        const SCALE_X = SCALE_Y * ASPECT;

        for (let i = 0; i < validCount; i++) {
            const i3 = i * 3;

            // --- 1. IMAGE RECONSTRUCTION ---
            let dx = 0, dy = 0, dz = 0;
            let r = 1, g = 1, b = 1;
            let brightness = 0.5;

            if (imgData && width > 0) {
                // Map linear index 'i' to (x,y) grid
                const col = i % width;
                const row = Math.floor(i / width);

                // Extract Color
                const pixelI = (row * width + col) * 4;
                r = imgData[pixelI] / 255;
                g = imgData[pixelI + 1] / 255;
                b = imgData[pixelI + 2] / 255;
                
                // Calculate Brightness for Depth (Bas-relief effect)
                brightness = (r + g + b) / 3;

                // Position: Center the grid
                dx = (col / width - 0.5) * SCALE_X;
                dy = (0.5 - row / height) * SCALE_Y;
                
                // Z: Depth based on brightness. Brighter = Closer
                dz = brightness * 3.0; 
                
                // Skip transparent pixels if PNG
                if (imgData[pixelI + 3] < 50) {
                     sizes[i] = 0;
                } else {
                     sizes[i] = Math.random() * 0.4 + 0.1;
                }
            } else {
                // Fallback procedural shape if image fails
                const theta = Math.random() * Math.PI * 2;
                const h = Math.random() * SCALE_Y - (SCALE_Y/2); 
                const taper = Math.cos(h * 0.3) * 1.5 + 2; 
                
                dx = Math.cos(theta) * taper;
                dy = h;
                dz = Math.sin(theta) * taper;

                // Random elegant colors
                r = 1.0; 
                g = 0.7 + Math.random() * 0.3; 
                b = 0.8 + Math.random() * 0.2;
                
                sizes[i] = 0.3;
            }

            // Sanitization: Ensure Finite
            if (!Number.isFinite(dx)) dx = 0;
            if (!Number.isFinite(dy)) dy = 0;
            if (!Number.isFinite(dz)) dz = 0;

            targetTree[i3] = dx;
            targetTree[i3+1] = dy + 2; // Lift up slightly
            targetTree[i3+2] = dz;

            // Set Color
            colors[i3] = Number.isFinite(r) ? r : 1;
            colors[i3+1] = Number.isFinite(g) ? g : 1;
            colors[i3+2] = Number.isFinite(b) ? b : 1;

            // --- 2. GALAXY VORTEX ---
            const galaxy = generateGalaxyShape(i, validCount);
            let gx = galaxy.x;
            let gy = galaxy.y;
            let gz = galaxy.z;
            
            if (!Number.isFinite(gx)) gx = 0;
            if (!Number.isFinite(gy)) gy = 0;
            if (!Number.isFinite(gz)) gz = 0;

            targetCloud[i3] = gx;
            targetCloud[i3+1] = gy;
            targetCloud[i3+2] = gz;

            // Init State = Target Tree
            positions[i3] = targetTree[i3];
            positions[i3+1] = targetTree[i3+1];
            positions[i3+2] = targetTree[i3+2];
        }

        return { positions, targetTree, targetCloud, colors, sizes };
    };

    let hasResolved = false;
    const safeResolve = (data: PointCloudData) => {
        if (hasResolved) return;
        hasResolved = true;
        resolve(data);
    };

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("No Context");

        const aspect = img.width / img.height;
        // Limit max particles to avoid performance crash on huge images
        const totalPixels = CONFIG.PARTICLE_COUNT; 
        
        const cols = Math.floor(Math.sqrt(totalPixels * aspect));
        const rows = Math.floor(totalPixels / cols);

        canvas.width = cols;
        canvas.height = rows;
        
        ctx.drawImage(img, 0, 0, cols, rows);
        
        const data = generateAll(cols, rows, ctx);
        safeResolve(data);

      } catch (e) {
          console.error("Image process error", e);
          safeResolve(generateAll(0, 0));
      }
    };

    img.onerror = (e) => {
        console.error("Image load failed, using fallback.", e);
        safeResolve(generateAll(0, 0));
    };

    // Safety timeout: if image hangs (e.g. network block), resolve with fallback after 3s
    setTimeout(() => {
        if (!hasResolved) {
            console.warn("Image load timed out, using fallback.");
            img.src = ""; // Cancel load
            safeResolve(generateAll(0, 0));
        }
    }, 3000);

    // Assign Source LAST to avoid race conditions
    img.src = imageUrl;
  });
};

export const generateTreeData = () => [];
