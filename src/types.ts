
export enum GameStatus {
  MENU = 'MENU',
  LOADING = 'LOADING',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY'
}

export interface Vector2D {
  x: number;
  y: number;
}

export interface Ball {
  pos: Vector2D;
  vel: Vector2D;
  radius: number;
  active: boolean;
}

export interface Paddle {
  x: number;
  vx: number;
  width: number;
  height: number;
  speed: number;
}

export interface Block {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  active: boolean;
  color: string;
}

export interface HeartItem {
  id: number;
  pos: Vector2D;
  active: boolean;
}

export enum MovementCommand {
  IDLE = 0,
  LEFT = -1,
  RIGHT = 1,
}

export interface MotionInput {
  command: MovementCommand;
  intensity: number;
  x: number; // 動作が発生しているカメラ内の正規化X座標 (0.0 ~ 1.0)
}

export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface PoseResults {
  poseLandmarks: Landmark[];
  segmentationMask?: any;
}

declare global {
  interface Window {
    Pose: any;
    Camera: any;
    drawConnectors: any;
    drawLandmarks: any;
    POSE_CONNECTIONS: any;
  }
}
