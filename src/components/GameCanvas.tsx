
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  GameStatus, 
  MovementCommand, 
  Ball, 
  Paddle, 
  Block, 
  MotionInput,
  HeartItem
} from '../types';
import { 
  CANVAS_WIDTH, 
  CANVAS_HEIGHT, 
  PADDLE_WIDTH, 
  PADDLE_HEIGHT, 
  BALL_RADIUS, 
  BALL_SPEED_BASE,
  ROWS,
  COLS,
  BLOCK_PADDING,
  BLOCK_HEIGHT,
  COLORS,
  INITIAL_LIVES,
  HEART_DROP_CHANCE,
  HEART_FALL_SPEED,
  HEART_SIZE,
  SPEED_MULTIPLIERS,
  SPEED_LABELS
} from '../constants';
import { Target, Zap, ChevronUp, Heart, Gauge, RotateCcw, Timer } from 'lucide-react';

interface GameCanvasProps {
  inputRef: React.RefObject<MotionInput>;
  onGameStatusChange: (status: GameStatus) => void;
  status: GameStatus;
  videoRef: React.RefObject<HTMLVideoElement>;
  totalTime: number; 
}

const GameCanvas: React.FC<GameCanvasProps> = ({ 
  inputRef, 
  onGameStatusChange, 
  status,
  videoRef,
  totalTime
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const statusRef = useRef<GameStatus>(status);
  const totalTimeRef = useRef<number>(totalTime);
  
  const [lives, setLives] = useState(INITIAL_LIVES);
  const [speedLevel, setSpeedLevel] = useState(0); 
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null);
  
  const livesRef = useRef(INITIAL_LIVES);
  const speedLevelRef = useRef(0);
  const scoreRef = useRef(0);
  const hitEffectRef = useRef(0);
  const nextHeartIdRef = useRef(0);
  
  useEffect(() => {
    statusRef.current = status;
    if (status === GameStatus.GAME_OVER) {
      setRetryCountdown(3);
      const timer = setInterval(() => {
        setRetryCountdown(prev => {
          if (prev !== null && prev <= 1) {
            clearInterval(timer);
            startGame();
            return null;
          }
          return prev !== null ? prev - 1 : null;
        });
      }, 1000);
      return () => clearInterval(timer);
    } else {
      setRetryCountdown(null);
    }
  }, [status]);

  // App.tsxからの累計時間を常にRefへ反映
  useEffect(() => {
    totalTimeRef.current = totalTime;
  }, [totalTime]);

  const lerpFactor = 0.5; 
  
  const paddleRef = useRef<Paddle>({ 
    x: (CANVAS_WIDTH - PADDLE_WIDTH) * 0.5, 
    vx: 0, 
    width: PADDLE_WIDTH, 
    height: PADDLE_HEIGHT, 
    speed: 0 
  });
  const ballRef = useRef<Ball>({ 
    pos: { x: CANVAS_WIDTH * 0.5, y: CANVAS_HEIGHT - 40 }, 
    vel: { x: 0, y: 0 }, 
    radius: BALL_RADIUS, 
    active: false 
  });
  const blocksRef = useRef<Block[]>([]);
  const heartsRef = useRef<HeartItem[]>([]);

  const initBlocks = useCallback(() => {
    const newBlocks: Block[] = [];
    const totalBlockWidth = CANVAS_WIDTH - (BLOCK_PADDING * 2);
    const blockWidth = (totalBlockWidth - (BLOCK_PADDING * (COLS - 1))) / COLS;

    const startY = BLOCK_PADDING + 55;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        newBlocks.push({
          id: r * COLS + c,
          x: BLOCK_PADDING + c * (blockWidth + BLOCK_PADDING),
          y: startY + r * (BLOCK_HEIGHT + BLOCK_PADDING),
          width: blockWidth,
          height: BLOCK_HEIGHT,
          active: true,
          color: COLORS[r % COLORS.length]
        });
      }
    }
    blocksRef.current = newBlocks;
    scoreRef.current = 0;
    heartsRef.current = [];
    livesRef.current = INITIAL_LIVES;
    setLives(livesRef.current);
  }, []);

  const startGame = () => {
    initBlocks();
    resetBall();
    onGameStatusChange(GameStatus.PLAYING);
    launchBall();
  };

  const resetBall = () => {
    ballRef.current.pos.x = CANVAS_WIDTH * 0.5;
    ballRef.current.pos.y = CANVAS_HEIGHT - 60;
    ballRef.current.vel.x = 0;
    ballRef.current.vel.y = 0;
    ballRef.current.active = false;
    paddleRef.current.x = (CANVAS_WIDTH - PADDLE_WIDTH) * 0.5;
  };

  const launchBall = () => {
    const multiplier = SPEED_MULTIPLIERS[speedLevelRef.current];
    ballRef.current.active = true;
    ballRef.current.vel.x = (Math.random() - 0.5) * (BALL_SPEED_BASE * 1.2 * multiplier);
    ballRef.current.vel.y = -BALL_SPEED_BASE * multiplier;
  };

  const toggleSpeed = () => {
    const nextSpeed = (speedLevel + 1) % 3;
    setSpeedLevel(nextSpeed);
    speedLevelRef.current = nextSpeed;
  };

  const update = () => {
    if (statusRef.current !== GameStatus.PLAYING) return;

    const p = paddleRef.current;
    const b = ballRef.current;
    const input = inputRef.current || { command: MovementCommand.IDLE, intensity: 0, x: 0.5 };

    const targetX = input.x * CANVAS_WIDTH - p.width * 0.5;
    p.x += (targetX - p.x) * lerpFactor;

    if (p.x < 0) p.x = 0;
    if (p.x > CANVAS_WIDTH - p.width) p.x = CANVAS_WIDTH - p.width;

    hitEffectRef.current = Math.max(0, hitEffectRef.current - 0.05);

    heartsRef.current = heartsRef.current.filter(h => h.active);
    for (const h of heartsRef.current) {
      h.pos.y += HEART_FALL_SPEED;
      
      const paddleTop = CANVAS_HEIGHT - 22;
      if (h.pos.y + HEART_SIZE/2 > paddleTop && h.pos.y - HEART_SIZE/2 < paddleTop + p.height &&
          h.pos.x + HEART_SIZE/2 > p.x && h.pos.x - HEART_SIZE/2 < p.x + p.width) {
        h.active = false;
        livesRef.current++;
        setLives(livesRef.current);
      }
      
      if (h.pos.y > CANVAS_HEIGHT + HEART_SIZE) h.active = false;
    }

    if (b.active) {
      b.pos.x += b.vel.x;
      b.pos.y += b.vel.y;

      if (b.pos.x < b.radius || b.pos.x > CANVAS_WIDTH - b.radius) b.vel.x *= -1;
      if (b.pos.y < b.radius) b.vel.y *= -1;

      if (b.pos.y > CANVAS_HEIGHT) {
        livesRef.current--;
        setLives(livesRef.current);
        if (livesRef.current <= 0) {
          onGameStatusChange(GameStatus.GAME_OVER);
        } else {
          resetBall();
          setTimeout(launchBall, 1000);
        }
        return;
      }

      const paddleTop = CANVAS_HEIGHT - 22;
      if (b.pos.y + b.radius > paddleTop && 
          b.pos.y - b.radius < paddleTop + p.height &&
          b.pos.x > p.x - 10 && b.pos.x < p.x + p.width + 10) {
        b.vel.y = -Math.abs(b.vel.y);
        const hitPoint = (b.pos.x - (p.x + p.width * 0.5)) / (p.width * 0.5);
        const multiplier = SPEED_MULTIPLIERS[speedLevelRef.current];
        b.vel.x = hitPoint * (BALL_SPEED_BASE * 0.8 * multiplier);
        hitEffectRef.current = 1.0;
      }

      for (let i = 0, len = blocksRef.current.length; i < len; i++) {
        const blk = blocksRef.current[i];
        if (!blk.active) continue;
        if (b.pos.x + b.radius > blk.x && b.pos.x - b.radius < blk.x + blk.width &&
            b.pos.y + b.radius > blk.y && b.pos.y - b.radius < blk.y + blk.height) {
          blk.active = false;
          b.vel.y *= -1;
          scoreRef.current += 10;
          
          if (Math.random() < HEART_DROP_CHANCE) {
            heartsRef.current.push({
              id: nextHeartIdRef.current++,
              pos: { x: blk.x + blk.width / 2, y: blk.y + blk.height / 2 },
              active: true
            });
          }
          break;
        }
      }
      if (blocksRef.current.every(bk => !bk.active)) onGameStatusChange(GameStatus.VICTORY);
    } else {
      b.pos.x = p.x + p.width * 0.5;
      b.pos.y = CANVAS_HEIGHT - 35;
    }
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = 'rgba(2, 6, 23, 0.4)'; 
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (statusRef.current === GameStatus.PLAYING) {
      ctx.strokeStyle = 'rgba(14, 165, 233, 0.3)';
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(0, CANVAS_HEIGHT * 0.8);
      ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT * 0.8);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(14, 165, 233, 0.05)';
      ctx.fillRect(0, CANVAS_HEIGHT * 0.8, CANVAS_WIDTH, CANVAS_HEIGHT * 0.2);
    }

    const blocks = blocksRef.current;
    for (let i = 0, len = blocks.length; i < len; i++) {
      const blk = blocks[i];
      if (!blk.active) continue;
      ctx.fillStyle = blk.color;
      ctx.fillRect(blk.x | 0, blk.y | 0, blk.width | 0, blk.height | 0);
    }

    for (const h of heartsRef.current) {
      drawHeart(ctx, h.pos.x, h.pos.y, HEART_SIZE);
    }

    const p = paddleRef.current;
    const hit = hitEffectRef.current;
    ctx.fillStyle = hit > 0.01 ? '#7dd3fc' : '#0ea5e9';
    ctx.fillRect(p.x | 0, (CANVAS_HEIGHT - 22) | 0, p.width | 0, 10);

    ctx.fillStyle = '#fff';
    ctx.shadowBlur = 15;
    ctx.shadowColor = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.arc(ballRef.current.pos.x | 0, ballRef.current.pos.y | 0, ballRef.current.radius, 0, 6.29);
    ctx.fill();
    ctx.shadowBlur = 0;

    // テキスト描画: SCOREとTIMEを大きく表示
    ctx.fillStyle = 'rgba(255,255,255,1)';
    ctx.font = 'bold 36px ui-monospace';
    
    // SCORE表示
    ctx.textAlign = 'right';
    ctx.fillText(`SCORE: ${scoreRef.current}`, CANVAS_WIDTH - 20, 55);

    // TIME表示
    ctx.textAlign = 'left';
    ctx.fillText(`TIME: ${totalTimeRef.current}s`, 20, 55);
  };

  const drawHeart = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    const topCurveHeight = size * 0.3;
    ctx.moveTo(0, topCurveHeight);
    ctx.bezierCurveTo(0, 0, -size / 2, 0, -size / 2, topCurveHeight);
    ctx.bezierCurveTo(-size / 2, size / 2, 0, size * 0.7, 0, size);
    ctx.bezierCurveTo(0, size * 0.7, size / 2, size / 2, size / 2, topCurveHeight);
    ctx.bezierCurveTo(size / 2, 0, 0, 0, 0, topCurveHeight);
    ctx.closePath();
    ctx.fillStyle = '#f43f5e';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-size/4, size/4, size/8, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fill();
    ctx.restore();
  };

  useEffect(() => {
    const frame = () => {
      update();
      draw();
      requestRef.current = requestAnimationFrame(frame);
    };
    requestRef.current = requestAnimationFrame(frame);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []); 

  useEffect(() => { initBlocks(); }, [initBlocks]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-black font-mono relative overflow-hidden">
      <div className="relative border border-slate-800 rounded-lg shadow-2xl bg-slate-900 overflow-hidden" style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}>
        <video 
          ref={videoRef} 
          className="absolute inset-0 w-full h-full object-cover scale-x-[-1] opacity-40" 
          playsInline 
          muted 
        />
        <canvas 
          ref={canvasRef} 
          width={CANVAS_WIDTH} 
          height={CANVAS_HEIGHT} 
          className="absolute inset-0 z-10 block" 
        />

        {status === GameStatus.PLAYING && (
          <>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center opacity-40 pointer-events-none z-20">
              <ChevronUp className="text-sky-400 animate-bounce" size={20} />
              <span className="text-[8px] text-sky-400 font-bold uppercase tracking-widest">Trigger Zone</span>
            </div>
            
            <div className="absolute top-12 left-4 z-30 flex items-center gap-2 text-white/40 pointer-events-none">
                <Timer size={20} className="animate-pulse" />
            </div>

            <div className="absolute bottom-32 left-4 z-30 flex items-center gap-2 bg-slate-950/70 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/20 shadow-2xl select-none">
              <Heart className="text-rose-500 fill-rose-500 animate-pulse" size={24} />
              <span className="text-white font-black text-2xl leading-none">{lives}</span>
            </div>

            <button 
              onClick={toggleSpeed}
              className="absolute bottom-32 right-4 z-30 flex items-center gap-3 bg-slate-950/70 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/20 hover:bg-sky-500/40 transition-all shadow-2xl active:scale-95 select-none group"
            >
              <Gauge className={`${speedLevel === 0 ? 'text-emerald-400' : speedLevel === 1 ? 'text-amber-400' : 'text-rose-500'} group-hover:scale-110 transition-transform`} size={24} />
              <div className="flex flex-col items-start leading-none">
                <span className="text-[9px] text-white/50 font-bold uppercase tracking-tighter">Level</span>
                <span className="text-white font-black text-base tracking-widest">{SPEED_LABELS[speedLevel]}</span>
              </div>
            </button>
          </>
        )}

        {status !== GameStatus.PLAYING && status !== GameStatus.LOADING && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center text-white text-center p-8 z-40">
                {status === GameStatus.GAME_OVER ? (
                  <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
                    <RotateCcw className="text-rose-500 mb-6 animate-spin-slow" size={64} />
                    <h1 className="text-5xl font-black mb-1 text-rose-500 tracking-tighter uppercase italic">GAME OVER</h1>
                    <div className="mt-8 flex flex-col items-center">
                      <p className="text-slate-400 text-xs uppercase tracking-[0.3em] mb-2">Total Accumulated Time</p>
                      <span className="text-6xl font-black text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]">{totalTime}s</span>
                      <p className="mt-6 text-slate-500 text-xs uppercase tracking-widest">Auto Restart in {retryCountdown}s</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Zap className="text-sky-400 mb-6 animate-pulse" size={48} />
                    <h1 className="text-4xl font-black mb-1 text-sky-400 tracking-tighter uppercase italic">CV BREAKOUT</h1>
                    <div className="my-2 text-2xl font-black text-white italic">LAST SCORE: {scoreRef.current}</div>
                    <div className="mb-4 text-sm text-slate-400 uppercase tracking-widest font-bold">TOTAL TIME: {totalTime}s</div>
                  </>
                )}

                <button 
                  onClick={startGame} 
                  className="mt-12 bg-sky-500 hover:bg-white hover:text-sky-500 text-white font-black py-4 px-12 rounded transition-all active:scale-95 shadow-xl text-lg tracking-widest"
                >
                  {status === GameStatus.MENU ? 'START ENGINE' : 'RETRY NOW'}
                </button>
            </div>
        )}

        {status === GameStatus.LOADING && (
            <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center text-sky-500 z-50">
                <div className="w-10 h-10 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                <p className="mt-6 text-[10px] font-black tracking-widest text-sky-400 uppercase">Waking Engine...</p>
                <p className="mt-2 text-[8px] text-slate-500 uppercase">Selecting optimal camera</p>
            </div>
        )}
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-x-8 gap-y-2 text-slate-600 text-[9px] font-bold tracking-widest uppercase">
        <div className="flex items-center gap-2 text-sky-500"><Target size={12}/><span>Time Tracking Active</span></div>
        <div className="flex items-center gap-2 text-rose-500"><Zap size={12}/><span>Fitness CV Engine</span></div>
      </div>

      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default GameCanvas;
