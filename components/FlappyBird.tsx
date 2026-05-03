
import React, { useEffect, useRef, useState } from 'react';

export const FlappyBird: React.FC<{ onGameOver?: (score: number) => void; onToggleExpand?: () => void }> = ({ onGameOver, onToggleExpand }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [highScore, setHighScore] = useState(0);

  useEffect(() => {
    const fetchScore = async () => {
      const userId = localStorage.getItem('dyslearn-device-id');
      if (userId) {
         try {
           const controller = new AbortController();
           setTimeout(() => controller.abort(), 2000);
           const r = await fetch(`/api/user/${userId}`, { signal: controller.signal });
           const res = await r.json();
           if (res.success && res.data) {
               setHighScore(res.data.flappy_highscore || 0);
           }
         } catch (e) { /* backend offline, use default score 0 */ }
      }
    };
    fetchScore();
  }, []);

  const gameState = useRef({
    bird: {
      y: 150,
      velocity: 0,
      gravity: 0.4,
      jump: -6,
      size: 20,
    },
    pipes: [] as { x: number; top: number; bottom: number; width: number; passed: boolean }[],
    frame: 0,
    score: 0,
  });

  const [showRules, setShowRules] = useState(true);
  const showRulesRef = useRef(true);

  const setShowRulesSync = (val: boolean) => {
    showRulesRef.current = val;
    setShowRules(val);
  };

  const flap = () => {
    if (showRulesRef.current) return;
    if (!gameStarted) {
      startGame();
    } else if (isGameOver) {
      restartGame();
    } else {
      gameState.current.bird.velocity = gameState.current.bird.jump;
    }
  };

  const toggleFullScreen = () => {
    if (onToggleExpand) {
      onToggleExpand();
    } else {
      const element = canvasRef.current?.parentElement;
      if (!element) return;
      if (!document.fullscreenElement) {
        element.requestFullscreen().catch(err => {
          console.error(`Error attempting to enable full-screen mode: ${err.message}`);
        });
      } else {
        document.exitFullscreen();
      }
    }
  };

  const startGame = () => {
    setShowRulesSync(false);
    setGameStarted(true);
    setIsGameOver(false);
    setScore(0);
    gameState.current.score = 0;
    gameState.current.pipes = [];
    gameState.current.frame = 0;
    gameState.current.bird.y = 150;
    gameState.current.bird.velocity = 0;
  };

  const restartGame = () => {
    startGame();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
        if (showRulesRef.current) {
          startGame();
        } else {
          flap();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameStarted, isGameOver, showRules]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const update = () => {
      if (!gameStarted || isGameOver || showRules) return;

      const state = gameState.current;
      const { bird, pipes } = state;

      // Update Bird
      bird.velocity += bird.gravity;
      bird.y += bird.velocity;

      // Ceiling and Floor Collision
      if (bird.y < 0 || bird.y + bird.size > canvas.height) {
        endGame();
      }

      // Update Pipes
      if (state.frame % 100 === 0) {
        const gap = 80;
        const minPipeHeight = 30;
        const maxPipeHeight = canvas.height - gap - minPipeHeight;
        const topHeight = Math.floor(Math.random() * (maxPipeHeight - minPipeHeight + 1)) + minPipeHeight;
        
        pipes.push({
          x: canvas.width,
          top: topHeight,
          bottom: canvas.height - topHeight - gap,
          width: 40,
          passed: false,
        });
      }

      for (let i = pipes.length - 1; i >= 0; i--) {
        pipes[i].x -= 2;

        // Collision Detection
        if (
          50 < pipes[i].x + pipes[i].width &&
          50 + bird.size > pipes[i].x &&
          (bird.y < pipes[i].top || bird.y + bird.size > canvas.height - pipes[i].bottom)
        ) {
          endGame();
        }

        // Scoring
        if (!pipes[i].passed && pipes[i].x < 50) {
          pipes[i].passed = true;
          state.score++;
          setScore(state.score);
        }

        if (pipes[i].x + pipes[i].width < 0) {
          pipes.splice(i, 1);
        }
      }

      state.frame++;
    };

    const endGame = () => {
      setIsGameOver(true);
      if (gameState.current.score > highScore) {
        setHighScore(gameState.current.score);
        const userId = localStorage.getItem('dyslearn-device-id');
        if (userId) {
          fetch(`/api/user/${userId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ flappy_highscore: gameState.current.score })
          }).catch(e => console.error(e));
        }
      }
      if (onGameOver) {
        onGameOver(gameState.current.score);
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const state = gameState.current;
      const { bird, pipes } = state;

      // Background
      ctx.fillStyle = '#70c5ce';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Pipes
      ctx.fillStyle = '#2ecc71';
      pipes.forEach(p => {
        // Top pipe
        ctx.fillRect(p.x, 0, p.width, p.top);
        ctx.strokeStyle = '#27ae60';
        ctx.lineWidth = 2;
        ctx.strokeRect(p.x, 0, p.width, p.top);
        
        // Bottom pipe
        ctx.fillRect(p.x, canvas.height - p.bottom, p.width, p.bottom);
        ctx.strokeRect(p.x, canvas.height - p.bottom, p.width, p.bottom);
      });

      // Bird
      ctx.save();
      ctx.translate(50 + bird.size / 2, bird.y + bird.size / 2);
      ctx.rotate(Math.min(Math.PI / 4, Math.max(-Math.PI / 4, bird.velocity * 0.1)));
      
      // Body
      ctx.fillStyle = '#f1c40f';
      ctx.fillRect(-bird.size / 2, -bird.size / 2, bird.size, bird.size);
      // Eye
      ctx.fillStyle = 'white';
      ctx.fillRect(bird.size / 4, -bird.size / 3, 4, 4);
      // Wing
      ctx.fillStyle = '#f39c12';
      ctx.fillRect(-bird.size / 2, 0, bird.size / 2, bird.size / 3);
      
      ctx.restore();

      if (!gameStarted) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Tap to Start Flapping', canvas.width / 2, canvas.height / 2);
      }

      if (isGameOver) {
        ctx.fillStyle = 'rgba(255,0,0,0.3)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 20);
        ctx.font = '16px Arial';
        ctx.fillText(`Score: ${state.score}`, canvas.width / 2, canvas.height / 2 + 10);
        ctx.fillText('Tap to Restart', canvas.width / 2, canvas.height / 2 + 40);
      }

      animationFrameId = requestAnimationFrame(() => {
        update();
        draw();
      });
    };

    draw();
    return () => cancelAnimationFrame(animationFrameId);
  }, [gameStarted, isGameOver, highScore]);

  return (
    <div className="flex flex-col items-center p-4 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] shadow-inner relative overflow-hidden">
      <div className="flex justify-between w-full mb-2 text-xs font-bold text-[var(--text-secondary)]">
        <span>HI: {highScore}</span>
        <div className="flex items-center gap-2">
          <span>SCORE: {score}</span>
          <button onClick={toggleFullScreen} className="p-1 hover:bg-[var(--bg-secondary)] rounded transition-colors" title="Full Screen">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
        </div>
      </div>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={260}
          height={300}
          className="bg-[#70c5ce] rounded-lg cursor-pointer touch-none"
          onClick={flap}
        />
        {showRules && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-4 text-white rounded-lg text-center">
            <h3 className="text-lg font-bold mb-2 text-yellow-400">Flappy Bird</h3>
            <ul className="text-[10px] space-y-1 mb-4 opacity-90">
              <li>• Press SPACE or TAP to flap</li>
              <li>• Fly through the gaps in the pipes</li>
              <li>• Don't hit the pipes or the ground!</li>
            </ul>
            <button 
              onClick={startGame}
              className="px-4 py-2 bg-yellow-500 rounded-full text-xs font-bold hover:scale-105 transition-transform"
            >
              START FLAPPING
            </button>
          </div>
        )}
      </div>
      <p className="mt-3 text-[10px] text-[var(--text-secondary)] opacity-60 text-center">
        Use SPACE or TAP to flap. Don't hit the pipes!
      </p>
    </div>
  );
};
