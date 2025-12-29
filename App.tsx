
import React, { useState, useRef, useEffect } from 'react';
import GameCanvas from './components/GameCanvas';
import { PoseService } from './services/poseService';
import { GameStatus, MotionInput, MovementCommand } from './types';

const App: React.FC = () => {
  const [gameStatus, setGameStatus] = useState<GameStatus>(GameStatus.MENU);
  const [totalTime, setTotalTime] = useState(0);
  
  const currentInputRef = useRef<MotionInput>({ 
    command: MovementCommand.IDLE, 
    intensity: 0,
    x: 0.5
  });
  const videoRef = useRef<HTMLVideoElement>(null);
  const serviceRef = useRef<PoseService | null>(null);

  // トータル運動時間のカウントアップ
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

  const handleStartRequest = async () => {
    if (serviceRef.current) {
      setGameStatus(GameStatus.PLAYING);
      return;
    }

    setGameStatus(GameStatus.LOADING);

    try {
      if (!videoRef.current) return;

      const service = new PoseService((input) => {
        currentInputRef.current = input;
      });

      await service.initialize(videoRef.current);
      serviceRef.current = service;
      
      setGameStatus(GameStatus.PLAYING);
    } catch (error) {
      console.error("Initialization failed", error);
      alert("Camera error: Please check your permissions and refresh.");
      setGameStatus(GameStatus.MENU);
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
      />
    </div>
  );
};

export default App;
