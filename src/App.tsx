
import React, { useState, useRef, useEffect } from 'react';
import GameCanvas from './components/GameCanvas';
import { PoseService } from './services/poseService';
import { GameStatus, MotionInput, MovementCommand } from './types';

const App: React.FC = () => {
  const [gameStatus, setGameStatus] = useState<GameStatus>(GameStatus.MENU);
  const [totalTime, setTotalTime] = useState(0);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  
  const currentInputRef = useRef<MotionInput>({ 
    command: MovementCommand.IDLE, 
    intensity: 0,
    x: 0.5
  });
  const videoRef = useRef<HTMLVideoElement>(null);
  const serviceRef = useRef<PoseService | null>(null);

  useEffect(() => {
    let interval: number | undefined;
    if (gameStatus === GameStatus.PLAYING) {
      interval = window.setInterval(() => {
        setTotalTime(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [gameStatus]);

  useEffect(() => {
    return () => {
      if (serviceRef.current) serviceRef.current.stop();
    };
  }, []);

  const handleStartRequest = async (mode: 'user' | 'environment' = facingMode) => {
    setGameStatus(GameStatus.LOADING);

    try {
      if (!videoRef.current) return;

      if (!serviceRef.current) {
        serviceRef.current = new PoseService((input) => {
          currentInputRef.current = input;
        });
      }

      await serviceRef.current.initialize(videoRef.current, mode);
      setGameStatus(GameStatus.PLAYING);
    } catch (error) {
      console.error("Camera connection failed:", error);
      alert("Error: Camera not found or permission denied.");
      setGameStatus(GameStatus.MENU);
    }
  };

  const handleToggleCamera = async () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);
    
    // プレイ中または再試行画面なら即座に切り替え
    if (gameStatus === GameStatus.PLAYING || gameStatus === GameStatus.GAME_OVER) {
      if (serviceRef.current) {
        serviceRef.current.stop();
        await handleStartRequest(newMode);
      }
    }
  };

  const handleGameStatusChange = (newStatus: GameStatus) => {
    if (gameStatus === GameStatus.MENU && newStatus === GameStatus.PLAYING) {
      handleStartRequest();
    } else {
      setGameStatus(newStatus);
    }
  };

  return (
    <div className="w-full h-screen bg-gray-950 flex flex-col overflow-hidden">
      <GameCanvas 
        inputRef={currentInputRef}
        status={gameStatus}
        onGameStatusChange={handleGameStatusChange}
        videoRef={videoRef}
        totalTime={totalTime}
        onToggleCamera={handleToggleCamera}
        facingMode={facingMode}
      />
    </div>
  );
};

export default App;
