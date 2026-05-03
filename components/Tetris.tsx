
import React, { useEffect, useRef, useState, useCallback } from 'react';

const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 20;

const TETROMINOS = {
  'I': [[1, 1, 1, 1]],
  'J': [[1, 0, 0], [1, 1, 1]],
  'L': [[0, 0, 1], [1, 1, 1]],
  'O': [[1, 1], [1, 1]],
  'S': [[0, 1, 1], [1, 1, 0]],
  'T': [[0, 1, 0], [1, 1, 1]],
  'Z': [[1, 1, 0], [0, 1, 1]],
};

const COLORS = {
  'I': '#00f0f0',
  'J': '#0000f0',
  'L': '#f0a000',
  'O': '#f0f000',
  'S': '#00f000',
  'T': '#a000f0',
  'Z': '#f00000',
};

export const Tetris: React.FC<{ onGameOver?: (score: number) => void; onToggleExpand?: () => void }> = ({ onGameOver, onToggleExpand }) => {
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
               setHighScore(res.data.tetris_highscore || 0);
           }
         } catch (e) { /* backend offline, use default score 0 */ }
      }
    };
    fetchScore();
  }, []);

  const gameState = useRef({
    grid: Array.from({ length: ROWS }, () => Array(COLS).fill(0)),
    piece: null as { shape: number[][], color: string, x: number, y: number } | null,
    score: 0,
    dropCounter: 0,
    dropInterval: 1000,
    lastTime: 0,
  });

  const [showRules, setShowRules] = useState(true);

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

  const createPiece = useCallback(() => {
    const keys = Object.keys(TETROMINOS) as (keyof typeof TETROMINOS)[];
    const type = keys[Math.floor(Math.random() * keys.length)];
    const shape = TETROMINOS[type];
    return {
      shape,
      color: COLORS[type],
      x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
      y: 0,
    };
  }, []);

  const collide = (grid: any[][], piece: any) => {
    const [m, o] = [piece.shape, { x: piece.x, y: piece.y }];
    for (let y = 0; y < m.length; ++y) {
      for (let x = 0; x < m[y].length; ++x) {
        if (m[y][x] !== 0 &&
          (grid[y + o.y] && grid[y + o.y][x + o.x]) !== 0) {
          return true;
        }
      }
    }
    return false;
  };

  const merge = (grid: any[][], piece: any) => {
    piece.shape.forEach((row: any[], y: number) => {
      row.forEach((value: number, x: number) => {
        if (value !== 0) {
          grid[y + piece.y][x + piece.x] = piece.color;
        }
      });
    });
  };

  const rotate = (matrix: number[][]) => {
    const rotated = matrix[0].map((_, index) => matrix.map(col => col[index]).reverse());
    return rotated;
  };

  const playerRotate = () => {
    if (showRules) return;
    const state = gameState.current;
    if (!state.piece) return;
    const pos = state.piece.x;
    let offset = 1;
    const oldShape = state.piece.shape;
    state.piece.shape = rotate(state.piece.shape);
    while (collide(state.grid, state.piece)) {
      state.piece.x += offset;
      offset = -(offset + (offset > 0 ? 1 : -1));
      if (offset > state.piece.shape[0].length) {
        state.piece.shape = oldShape;
        state.piece.x = pos;
        return;
      }
    }
  };

  const gridSweep = () => {
    const state = gameState.current;
    let rowCount = 1;
    outer: for (let y = state.grid.length - 1; y >= 0; --y) {
      for (let x = 0; x < state.grid[y].length; ++x) {
        if (state.grid[y][x] === 0) {
          continue outer;
        }
      }
      const row = state.grid.splice(y, 1)[0].fill(0);
      state.grid.unshift(row);
      ++y;
      state.score += rowCount * 10;
      rowCount *= 2;
      setScore(state.score);
      state.dropInterval = Math.max(100, 1000 - (state.score / 100) * 50);
    }
  };

  const playerDrop = () => {
    if (showRules) return;
    const state = gameState.current;
    if (!state.piece) return;
    state.piece.y++;
    if (collide(state.grid, state.piece)) {
      state.piece.y--;
      merge(state.grid, state.piece);
      playerReset();
      gridSweep();
    }
    state.dropCounter = 0;
  };

  const playerMove = (dir: number) => {
    if (showRules) return;
    const state = gameState.current;
    if (!state.piece) return;
    state.piece.x += dir;
    if (collide(state.grid, state.piece)) {
      state.piece.x -= dir;
    }
  };

  const playerReset = () => {
    const state = gameState.current;
    state.piece = createPiece();
    if (collide(state.grid, state.piece)) {
      setIsGameOver(true);
      if (state.score > highScore) {
        setHighScore(state.score);
        const userId = localStorage.getItem('dyslearn-device-id');
        if (userId) {
          fetch(`/api/user/${userId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tetris_highscore: state.score })
          }).catch(e => console.error(e));
        }
      }
      if (onGameOver) {
        onGameOver(state.score);
      }
    }
  };

  const startGame = () => {
    setShowRules(false);
    setGameStarted(true);
    setIsGameOver(false);
    setScore(0);
    gameState.current.score = 0;
    gameState.current.grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    gameState.current.dropInterval = 1000;
    playerReset();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }

      if (showRules) {
        if (e.code === 'Space') startGame();
        return;
      }
      if (!gameStarted || isGameOver) {
        if (e.code === 'Space') startGame();
        return;
      }
      if (e.code === 'ArrowLeft') playerMove(-1);
      if (e.code === 'ArrowRight') playerMove(1);
      if (e.code === 'ArrowDown') playerDrop();
      if (e.code === 'ArrowUp') playerRotate();
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

    const draw = (time = 0) => {
      const state = gameState.current;
      const deltaTime = time - state.lastTime;
      state.lastTime = time;

      if (gameStarted && !isGameOver && !showRules) {
        state.dropCounter += deltaTime;
        if (state.dropCounter > state.dropInterval) {
          playerDrop();
        }
      }

      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Grid
      state.grid.forEach((row, y) => {
        row.forEach((value, x) => {
          if (value !== 0) {
            ctx.fillStyle = value;
            ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
          }
        });
      });

      // Draw Piece
      if (state.piece) {
        ctx.fillStyle = state.piece.color;
        state.piece.shape.forEach((row, y) => {
          row.forEach((value, x) => {
            if (value !== 0) {
              ctx.fillRect((state.piece!.x + x) * BLOCK_SIZE, (state.piece!.y + y) * BLOCK_SIZE, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
            }
          });
        });
      }

      if (!gameStarted) {
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Press SPACE to Start', canvas.width / 2, canvas.height / 2);
      }

      if (isGameOver) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 20);
        ctx.font = '14px Arial';
        ctx.fillText(`Score: ${state.score}`, canvas.width / 2, canvas.height / 2 + 10);
        ctx.fillText('Press SPACE to Restart', canvas.width / 2, canvas.height / 2 + 40);
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animationFrameId);
  }, [gameStarted, isGameOver]);

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
          width={COLS * BLOCK_SIZE}
          height={ROWS * BLOCK_SIZE}
          className="bg-black rounded-lg border border-gray-700"
        />
        {showRules && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-4 text-white rounded-lg text-center">
            <h3 className="text-lg font-bold mb-2 text-blue-400">Tetris</h3>
            <ul className="text-[10px] space-y-1 mb-4 opacity-90">
              <li>• ARROWS to move and rotate</li>
              <li>• DOWN ARROW to drop faster</li>
              <li>• Complete lines to score points</li>
            </ul>
            <button 
              onClick={startGame}
              className="px-4 py-2 bg-blue-500 rounded-full text-xs font-bold hover:scale-105 transition-transform"
            >
              START GAME
            </button>
          </div>
        )}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 w-full">
        <button onClick={() => playerMove(-1)} className="p-2 bg-gray-200 dark:bg-gray-800 rounded-lg text-xs">←</button>
        <button onClick={playerRotate} className="p-2 bg-gray-200 dark:bg-gray-800 rounded-lg text-xs">↻</button>
        <button onClick={() => playerMove(1)} className="p-2 bg-gray-200 dark:bg-gray-800 rounded-lg text-xs">→</button>
        <div />
        <button onClick={playerDrop} className="p-2 bg-gray-200 dark:bg-gray-800 rounded-lg text-xs">↓</button>
        <div />
      </div>
      <p className="mt-3 text-[10px] text-[var(--text-secondary)] opacity-60 text-center">
        ARROWS to move/rotate. SPACE to start.
      </p>
    </div>
  );
};
