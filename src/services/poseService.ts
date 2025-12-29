
import { MovementCommand, MotionInput, PoseResults } from '../types';
import { PIXEL_DIFF_THRESHOLD, MOTION_ENERGY_MIN } from '../constants';

export class PoseService {
  private videoElement: HTMLVideoElement | null = null;
  private onResultsCallback: (input: MotionInput, results: PoseResults) => void;
  
  private processingCanvas: HTMLCanvasElement;
  private pCtx: CanvasRenderingContext2D;
  private prevFrame: Uint8ClampedArray | null = null;
  
  private animationId: number | null = null;
  private lastX: number = 0.5;
  
  private readonly W = 64;
  private readonly H = 48;

  constructor(onResults: (input: MotionInput, results: PoseResults) => void) {
    this.onResultsCallback = onResults;
    this.processingCanvas = document.createElement('canvas');
    this.processingCanvas.width = this.W;
    this.processingCanvas.height = this.H;
    this.pCtx = this.processingCanvas.getContext('2d', { willReadFrequently: true })!;
  }

  public async initialize(videoElement: HTMLVideoElement, facingMode: 'user' | 'environment' = 'environment'): Promise<void> {
    this.videoElement = videoElement;
    
    const getStream = async (mode: 'user' | 'environment', exact: boolean) => {
      const constraints = { 
        video: { 
          facingMode: exact ? { exact: mode } : mode,
          width: { ideal: 640 }, 
          height: { ideal: 480 },
          frameRate: { ideal: 30 } 
        } 
      };
      return await navigator.mediaDevices.getUserMedia(constraints);
    };

    try {
      let stream;
      try {
        // 指定されたモードで厳密に試行
        stream = await getStream(facingMode, true);
      } catch (e) {
        console.warn(`Exact ${facingMode} camera not found, trying ideal...`);
        stream = await getStream(facingMode, false);
      }
      
      this.videoElement.srcObject = stream;
      
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Video load timeout")), 10000);
        this.videoElement!.onloadedmetadata = () => {
          clearTimeout(timeout);
          this.videoElement!.play().then(resolve).catch(reject);
        };
      });

      if (this.animationId) cancelAnimationFrame(this.animationId);
      this.startDetection();
    } catch (error) {
      console.error("Camera access denied or failed", error);
      throw error;
    }
  }

  private startDetection() {
    const detect = () => {
      if (!this.videoElement) return;
      this.processFrame();
      this.animationId = requestAnimationFrame(detect);
    };
    this.animationId = requestAnimationFrame(detect);
  }

  private processFrame() {
    if (!this.videoElement || this.videoElement.paused) return;

    this.pCtx.drawImage(this.videoElement, 0, 0, this.W, this.H);
    const frame = this.pCtx.getImageData(0, 0, this.W, this.H);
    const data = frame.data;

    if (this.prevFrame) {
      let leftEnergy = 0;
      let rightEnergy = 0;
      let centerXSum = 0;
      let totalMotionPixels = 0;

      const startY = Math.floor(this.H * 0.7);
      const startIndex = startY * this.W * 4;

      for (let i = startIndex; i < data.length; i += 4) {
        const curr = (data[i] + data[i+1] + data[i+2]) / 3;
        const prev = (this.prevFrame[i] + this.prevFrame[i+1] + this.prevFrame[i+2]) / 3;
        
        if (Math.abs(curr - prev) > PIXEL_DIFF_THRESHOLD) {
          const px = (i / 4) % this.W;
          
          if (px < this.W / 2) {
            leftEnergy++;
          } else {
            rightEnergy++;
          }
          
          centerXSum += px;
          totalMotionPixels++;
        }
      }

      let command = MovementCommand.IDLE;
      let intensity = 0;

      if (totalMotionPixels > MOTION_ENERGY_MIN) {
        const centroidX = centerXSum / totalMotionPixels;
        this.lastX = centroidX / this.W;

        if (leftEnergy > rightEnergy) {
          command = MovementCommand.LEFT;
          intensity = Math.min(leftEnergy / 50, 1.0);
        } else {
          command = MovementCommand.RIGHT;
          intensity = Math.min(rightEnergy / 50, 1.0);
        }
      }

      this.onResultsCallback({
        command,
        intensity,
        x: 1.0 - this.lastX
      }, { poseLandmarks: [] });
    }

    this.prevFrame = new Uint8ClampedArray(data);
  }

  public stop() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    if (this.videoElement && this.videoElement.srcObject) {
      (this.videoElement.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      this.videoElement.srcObject = null;
    }
  }
}
