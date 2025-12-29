
export const CANVAS_WIDTH = window.innerWidth; 
export const CANVAS_HEIGHT = window.innerHeight; 

export const PADDLE_WIDTH = CANVAS_WIDTH * 0.4; 
export const PADDLE_HEIGHT = 14;
export const BALL_RADIUS = 12;
export const BALL_SPEED_BASE = 4.0; 

// 速度レベル倍率 (当初の [1.0, 1.8,2.6] の 1/3 に調整)
export const SPEED_MULTIPLIERS = [0.8, 1.8, 2.8];
export const SPEED_LABELS = ['SLOW', 'MID', 'FAST'];

export const ROWS = 5;
export const COLS = 6;
export const BLOCK_PADDING = 4;
export const BLOCK_HEIGHT = 24;

export const INITIAL_LIVES = 5;
export const HEART_DROP_CHANCE = 0.12; 
export const HEART_FALL_SPEED = 2.8;
export const HEART_SIZE = 26;

export const COLORS = [
  '#f43f5e', // rose-500
  '#f59e0b', // amber-500
  '#10b981', // emerald-500
  '#3b82f6', // blue-500
  '#8b5cf6', // violet-500
];

// フレーム間差分法の感度 (0~255)
export const PIXEL_DIFF_THRESHOLD = 30;
// 最低限必要な「動き」のピクセル数
export const MOTION_ENERGY_MIN = 15;
