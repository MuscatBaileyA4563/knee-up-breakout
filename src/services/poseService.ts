
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

  public async initialize(videoElement: HTMLVideoElement): Promise<void> {
    this.videoElement = videoElement;
    
    // 背面カメラ（environment）を優先的にリクエスト
    const constraints = { 
      video: { 
        facingMode: { exact: 'environment' },
        width: { ideal: 640 }, 
        height: { ideal: 480 },
        frameRate: { ideal: 30 } 
      } 
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.videoElement.srcObject = stream;
      
      await new Promise((resolve) => {
        this.videoElement!.onloadedmetadata = () => {
          this.videoElement!.play();
          resolve(true);
        };
      });

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

      // 下部1/5のピクセルのみを走査
      const startY = Math.floor(this.H * 0.8);
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

      // X座標の反転設定（アウトカメラの場合は反転が不要な場合もあるが、操作の直感性のために維持）
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
    }
  }
}
