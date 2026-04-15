
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
import { Zap, ChevronUp, Heart, Gauge, RotateCcw, Camera, Trophy, Settings, X } from 'lucide-react';

interface GameCanvasProps {
  inputRef: React.RefObject<MotionInput>;
  onGameStatusChange: (status: GameStatus) => void;
  status: GameStatus;
  videoRef: React.RefObject<HTMLVideoElement>;
  totalTime: number; 
  onToggleCamera: () => void;
  facingMode: 'user' | 'environment';
}

const GameCanvas: React.FC<GameCanvasProps> = ({ 
  inputRef, 
  onGameStatusChange, 
  status,
  videoRef,
  totalTime,
  onToggleCamera,
  facingMode
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const statusRef = useRef<GameStatus>(status);
  const totalTimeRef = useRef<number>(totalTime);
  const scoreRef = useRef<number>(0);
  
  const [lives, setLives] = useState(INITIAL_LIVES);
  const [speedLevel, setSpeedLevel] = useState(0); 
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  
  const livesRef = useRef(INITIAL_LIVES);
  const speedLevelRef = useRef(0);
  const hitEffectRef = useRef(0);
  const nextHeartIdRef = useRef(0);

  const PADDLE_Y = CANVAS_HEIGHT * 0.88;
  const RECOGNITION_Y = CANVAS_HEIGHT * 0.75;
  
  useEffect(() => {
    statusRef.current = status;
    if (status === GameStatus.GAME_OVER || status === GameStatus.VICTORY) {
      setShowSettings(false);
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
    pos: { x: CANVAS_WIDTH * 0.5, y: PADDLE_Y - 40 }, 
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
    const startY = 100;

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
    ballRef.current.pos.y = PADDLE_Y - 30;
    ballRef.current.vel.x = 0;
    ballRef.current.vel.y = 0;
    ballRef.current.active = false;
    paddleRef.current.x = (CANVAS_WIDTH - PADDLE_WIDTH) * 0.5;
  };

  const launchBall = () => {
    const multiplier = SPEED_MULTIPLIERS[speedLevelRef.current];
    ballRef.current.active = true;
    ballRef.current.vel.x = (Math.random() - 0.5) * (BALL_SPEED_BASE * 1.5 * multiplier);
    ballRef.current.vel.y = -BALL_SPEED_BASE * 1.2 * multiplier;
  };

  const toggleSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextSpeed = (speedLevel + 1) % 3;
    setSpeedLevel(nextSpeed);
    speedLevelRef.current = nextSpeed;
  };

  const update = () => {
    if (statusRef.current !== GameStatus.PLAYING) return;

    const p = paddleRef.current;
    const b = ballRef.current;
    const input = inputRef.current || { command: MovementCommand.IDLE, intensity: 0, x: 0.5 };

    // PoseService側ですでに反転処理が行われているため、input.xをそのまま画面座標として使用する
    const effectiveX = input.x;

    const targetX = effectiveX * CANVAS_WIDTH - p.width * 0.5;
    p.x += (targetX - p.x) * lerpFactor;

    if (p.x < 0) p.x = 0;
    if (p.x > CANVAS_WIDTH - p.width) p.x = CANVAS_WIDTH - p.width;

    hitEffectRef.current = Math.max(0, hitEffectRef.current - 0.05);

    heartsRef.current = heartsRef.current.filter(h => h.active);
    for (const h of heartsRef.current) {
      h.pos.y += HEART_FALL_SPEED;
      
      if (h.pos.y + HEART_SIZE/2 > PADDLE_Y && h.pos.y - HEART_SIZE/2 < PADDLE_Y + p.height &&
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

      if (b.pos.y + b.radius > PADDLE_Y && 
          b.pos.y - b.radius < PADDLE_Y + p.height &&
          b.pos.x > p.x - 10 && b.pos.x < p.x + p.width + 10) {
        b.vel.y = -Math.abs(b.vel.y);
        const hitPoint = (b.pos.x - (p.x + p.width * 0.5)) / (p.width * 0.5);
        const multiplier = SPEED_MULTIPLIERS[speedLevelRef.current];
        b.vel.x = hitPoint * (BALL_SPEED_BASE * multiplier);
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
      if (blocksRef.current.length > 0 && blocksRef.current.every(bk => !bk.active)) {
        onGameStatusChange(GameStatus.VICTORY);
      }
    } else {
      b.pos.x = p.x + p.width * 0.5;
      b.pos.y = PADDLE_Y - 15;
    }
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = 'rgba(2, 6, 23, 0.5)'; 
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (statusRef.current === GameStatus.PLAYING) {
      ctx.strokeStyle = 'rgba(14, 165, 233, 0.3)';
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(0, RECOGNITION_Y);
      ctx.lineTo(CANVAS_WIDTH, RECOGNITION_Y);
      ctx.stroke();
      ctx.setLineDash([]);
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
    ctx.fillRect(p.x | 0, PADDLE_Y | 0, p.width | 0, PADDLE_HEIGHT);

    ctx.fillStyle = '#fff';
    ctx.shadowBlur = 15;
    ctx.shadowColor = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.arc(ballRef.current.pos.x | 0, ballRef.current.pos.y | 0, ballRef.current.radius, 0, 6.29);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Header UI
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 24px ui-monospace';
    ctx.shadowBlur = 6;
    ctx.shadowColor = 'black';
    ctx.textAlign = 'right';
    ctx.fillText(`SCORE: ${scoreRef.current}`, CANVAS_WIDTH - 20, 50);
    ctx.textAlign = 'left';
    ctx.fillText(`TIME: ${totalTimeRef.current}s`, 20, 50);
    ctx.shadowBlur = 0;
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

  const bottomOffsetForUI = CANVAS_HEIGHT - RECOGNITION_Y + 10; 
  const UI_PANEL_WIDTH = '64px'; 
  const UI_PANEL_HEIGHT = '52px';

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-black font-mono relative overflow-hidden">
      <div className="relative w-full h-full bg-slate-900 overflow-hidden">
        <video 
          ref={videoRef} 
          className={`absolute inset-0 w-full h-full object-cover opacity-40 ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
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
            <div 
              className="absolute right-6 z-40 flex flex-col items-center gap-3"
              style={{ bottom: `${bottomOffsetForUI}px` }}
            >
              {showSettings && (
                <div className="flex flex-col gap-3 p-2 bg-slate-950/80 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onToggleCamera(); }}
                    className="w-12 h-12 flex flex-col items-center justify-center hover:bg-white/10 rounded-2xl transition-all active:scale-90 group"
                  >
                    <Camera className="text-sky-400 group-hover:text-white" size={20} />
                    <span className="text-[7px] text-white/40 font-black uppercase mt-1 leading-none">{facingMode === 'user' ? 'FRONT' : 'BACK'}</span>
                  </button>
                  <div className="h-[1px] bg-white/10 w-full" />
                  <button 
                    onClick={toggleSpeed}
                    className="w-12 h-12 flex flex-col items-center justify-center hover:bg-white/10 rounded-2xl transition-all active:scale-90 group"
                  >
                    <Gauge className={`${speedLevel === 0 ? 'text-emerald-400' : speedLevel === 1 ? 'text-amber-400' : 'text-rose-500'} transition-colors`} size={20} />
                    <span className="text-[7px] text-white/40 font-black uppercase mt-1 leading-none">{SPEED_LABELS[speedLevel]}</span>
                  </button>
                </div>
              )}
              
              <button 
                onClick={() => setShowSettings(!showSettings)}
                className={`flex items-center justify-center bg-slate-950/70 backdrop-blur-xl rounded-2xl border transition-all shadow-2xl active:scale-95 ${showSettings ? 'border-sky-500 bg-sky-500/20' : 'border-white/10'}`}
                style={{ width: UI_PANEL_WIDTH, height: UI_PANEL_HEIGHT }}
              >
                {showSettings ? <X className="text-white" size={28} /> : <Settings className="text-sky-400" size={28} />}
              </button>
            </div>

            <div 
              className="absolute left-6 z-30 flex items-center justify-center gap-2 bg-slate-950/70 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl"
              style={{ bottom: `${bottomOffsetForUI}px`, width: UI_PANEL_WIDTH, height: UI_PANEL_HEIGHT }}
            >
              <Heart className="text-rose-500 fill-rose-500 animate-pulse" size={22} />
              <span className="text-white font-black text-2xl leading-none">{lives}</span>
            </div>

            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center opacity-50 pointer-events-none z-20">
              <ChevronUp className="text-sky-400 animate-bounce" size={32} />
              <span className="text-[12px] text-sky-400 font-black uppercase tracking-[0.3em]">KNEE UP TO MOVE</span>
            </div>
          </>
        )}

        {status === GameStatus.MENU && (
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 w-full flex flex-col items-center">
              <button 
                onClick={onToggleCamera}
                className="bg-slate-950/80 backdrop-blur-xl flex items-center gap-3 px-8 py-4 rounded-full border border-white/20 hover:bg-white/10 transition-all shadow-2xl active:scale-95 group mb-4"
              >
                <Camera className="text-sky-400" size={24} />
                <span className="text-white font-black text-sm uppercase tracking-widest leading-none">
                  Switch Camera
                </span>
              </button>
           </div>
        )}

        {status !== GameStatus.PLAYING && status !== GameStatus.LOADING && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-lg flex flex-col items-center justify-center text-white text-center p-10 z-40">
                {status === GameStatus.GAME_OVER ? (
                  <div className="flex flex-col items-center animate-in fade-in zoom-in duration-500">
                    <RotateCcw className="text-rose-500 mb-10 animate-spin-slow" size={96} />
                    <h1 className="text-7xl font-black mb-4 text-rose-500 tracking-tighter uppercase italic leading-none">GAME OVER</h1>
                    <div className="mt-10 flex flex-col items-center bg-white/5 p-10 rounded-[3rem] border border-white/10 w-full max-w-sm">
                      <p className="text-slate-400 text-[11px] uppercase tracking-[0.5em] mb-4">Total Workout Time</p>
                      <span className="text-8xl font-black text-white drop-shadow-[0_0_35px_rgba(255,255,255,0.4)]">{totalTime}s</span>
                      <div className="mt-8 flex items-center gap-3 text-sky-400 font-black uppercase text-sm">
                        <Zap size={20}/><span>SCORE: {scoreRef.current}</span>
                      </div>
                      <p className="mt-10 text-slate-500 text-[10px] uppercase tracking-[0.4em] animate-pulse italic">RESTARTING IN {retryCountdown}s...</p>
                    </div>
                  </div>
                ) : status === GameStatus.VICTORY ? (
                   <div className="flex flex-col items-center animate-in fade-in zoom-in duration-500">
                    <Trophy className="text-amber-400 mb-10 animate-bounce" size={96} />
                    <h1 className="text-7xl font-black mb-4 text-amber-400 tracking-tighter uppercase italic leading-none text-center">VICTORY</h1>
                    <div className="mt-10 flex flex-col items-center bg-white/5 p-10 rounded-[3rem] border border-white/10 w-full max-w-sm">
                      <p className="text-slate-400 text-[11px] uppercase tracking-[0.5em] mb-4">All Blocks Destroyed</p>
                      <span className="text-8xl font-black text-white drop-shadow-[0_0_35px_rgba(251,191,36,0.5)]">CLEARED</span>
                      <div className="mt-8 flex items-center gap-3 text-emerald-400 font-black uppercase text-sm">
                        <Zap size={20}/><span>BONUS +1000</span>
                      </div>
                      <p className="mt-10 text-slate-500 text-[10px] uppercase tracking-[0.4em] animate-pulse italic">NEXT ROUND IN {retryCountdown}s...</p>
                    </div>
                  </div>
                ) : (
                  <div className="animate-in fade-in slide-in-from-bottom-12 duration-700 flex flex-col items-center">
                    <div className="w-32 h-32 bg-sky-500/20 rounded-full flex items-center justify-center mb-10 border border-sky-500/30">
                      <Zap className="text-sky-400" size={64} />
                    </div>
                    <h1 className="text-6xl font-black mb-3 text-white tracking-tighter uppercase italic leading-none">CV BREAKOUT</h1>
                    <p className="text-sky-400 font-black tracking-[0.6em] text-[12px] uppercase mb-16">PRO FITNESS ENGINE</p>
                    
                    <div className="grid grid-cols-2 gap-6 w-full max-w-md mb-16">
                      <div className="bg-white/5 p-6 rounded-3xl border border-white/10 text-left">
                        <div className="text-white/40 text-[10px] uppercase font-black tracking-widest mb-2">TIME</div>
                        <div className="text-3xl font-black">{totalTime}s</div>
                      </div>
                      <div className="bg-white/5 p-6 rounded-3xl border border-white/10 text-left">
                        <div className="text-white/40 text-[10px] uppercase font-black tracking-widest mb-2">SCORE</div>
                        <div className="text-3xl font-black">{scoreRef.current}</div>
                      </div>
                    </div>
                  </div>
                )}

                <button 
                  onClick={startGame} 
                  className="mt-6 bg-sky-500 hover:bg-white hover:text-sky-500 text-white font-black py-6 px-20 rounded-full transition-all active:scale-95 shadow-[0_0_40px_rgba(14,165,233,0.6)] text-2xl tracking-widest uppercase italic"
                >
                  {status === GameStatus.MENU ? 'IGNITE' : 'CONTINUE'}
                </button>
            </div>
        )}

        {status === GameStatus.LOADING && (
            <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center text-sky-500 z-50">
                <div className="w-20 h-20 border-4 border-sky-400 border-t-transparent rounded-full animate-spin mb-10" />
                <h2 className="text-2xl font-black tracking-[0.3em] text-white uppercase italic">Initializing</h2>
                <p className="mt-3 text-[11px] font-black tracking-[0.4em] text-sky-400 uppercase">Synchronizing Visual Core</p>
            </div>
        )}
      </div>

      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 15s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default GameCanvas;
