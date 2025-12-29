
export const CANVAS_WIDTH = 400; 
export const CANVAS_HEIGHT = 600; 

export const PADDLE_WIDTH = 180; 
export const PADDLE_HEIGHT = 12;
export const BALL_RADIUS = 11; // 14 * 0.8 = 11.2
export const BALL_SPEED_BASE = 3.8; 

// 速度レベル倍率
export const SPEED_MULTIPLIERS = [1.0, 1.8, 2.6];
export const SPEED_LABELS = ['SLOW', 'MID', 'FAST'];

export const ROWS = 5;
export const COLS = 6;
export const BLOCK_PADDING = 5;
export const BLOCK_HEIGHT = 20;

export const INITIAL_LIVES = 5;
export const HEART_DROP_CHANCE = 0.1; // 10%
export const HEART_FALL_SPEED = 2.5;
export const HEART_SIZE = 24; // 以前の約2倍

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
