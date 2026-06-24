import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { PartyPopper, X } from "lucide-react";

// Pre-generate disco-ball tiles (rows x cols on a circular mask)
const ROWS = 12;
const COLS = 12;
const TILES = Array.from({ length: ROWS * COLS }, (_, i) => ({
  delay: Math.random() * 2,
  duration: 1.2 + Math.random() * 1.8,
  hue: 180 + Math.random() * 60, // silvery-blue tint
  key: i,
}));

const LIGHT_COLORS = [
  "rgba(255, 64, 129, 0.55)",
  "rgba(64, 196, 255, 0.55)",
  "rgba(255, 235, 59, 0.55)",
  "rgba(124, 252, 0, 0.5)",
  "rgba(186, 85, 211, 0.55)",
];

interface Confetti {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rot: number;
  vr: number;
  color: string;
}

const CONFETTI_COLORS = [
  "#ff4081",
  "#40c4ff",
  "#ffeb3b",
  "#69f0ae",
  "#b388ff",
  "#ff8a65",
];

interface PartyOverlayProps {
  open: boolean;
  onClose: () => void;
}

export function PartyOverlay({ open, onClose }: PartyOverlayProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const confettiRef = useRef<Confetti[]>([]);

  // Audio control
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (open) {
      audio.currentTime = 0;
      audio.volume = 0.7;
      void audio.play().catch(() => {
        /* autoplay blocked or file missing — overlay still works */
      });
    } else {
      audio.pause();
      audio.currentTime = 0;
    }
  }, [open]);

  // Confetti loop
  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const spawn = (n: number) => {
      for (let i = 0; i < n; i++) {
        confettiRef.current.push({
          x: Math.random() * canvas.width,
          y: -10 - Math.random() * canvas.height * 0.3,
          vx: (Math.random() - 0.5) * 1.5,
          vy: 1.5 + Math.random() * 2.5,
          size: 4 + Math.random() * 6,
          rot: Math.random() * Math.PI * 2,
          vr: (Math.random() - 0.5) * 0.2,
          color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        });
      }
    };
    spawn(120);

    let lastSpawn = performance.now();
    const tick = (now: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (now - lastSpawn > 120) {
        spawn(6);
        lastSpawn = now;
      }
      const arr = confettiRef.current;
      for (let i = arr.length - 1; i >= 0; i--) {
        const c = arr[i];
        c.x += c.vx;
        c.y += c.vy;
        c.rot += c.vr;
        if (c.y > canvas.height + 20) {
          arr.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.rot);
        ctx.fillStyle = c.color;
        ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size * 0.5);
        ctx.restore();
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("resize", resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      confettiRef.current = [];
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [open]);

  if (!open) {
    // Keep audio element mounted so ref stays stable
    return (
      <audio ref={audioRef} loop preload="auto" style={{ display: "none" }}>
        <source src="/party.mp3" type="audio/mpeg" />
      </audio>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      {/* Moving colored disco lights */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {LIGHT_COLORS.map((color, i) => (
          <div
            key={i}
            className="absolute h-[60vmin] w-[60vmin] rounded-full blur-3xl party-light"
            style={{
              background: color,
              left: `${(i * 23) % 100}%`,
              top: `${(i * 37) % 100}%`,
              animationDelay: `${i * -1.7}s`,
            }}
          />
        ))}
      </div>

      {/* Confetti canvas */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full"
      />

      {/* Disco ball */}
      <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 party-ball-drop">
        <div className="relative">
          {/* Cable */}
          <div className="absolute left-1/2 -top-[40vh] h-[40vh] w-px -translate-x-1/2 bg-white/30" />
          {/* Glow */}
          <div
            className="absolute inset-0 -m-16 rounded-full blur-2xl"
            style={{
              background:
                "radial-gradient(circle, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 70%)",
            }}
          />
          <div
            className="relative h-56 w-56 overflow-hidden rounded-full bg-slate-800 shadow-2xl"
            style={{
              backgroundImage:
                "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.5), rgba(0,0,0,0.6) 70%)",
            }}
          >
            <div
              className="grid h-full w-full"
              style={{
                gridTemplateColumns: `repeat(${COLS}, 1fr)`,
                gridTemplateRows: `repeat(${ROWS}, 1fr)`,
                gap: "1px",
                padding: "1px",
              }}
            >
              {TILES.map((t) => (
                <div
                  key={t.key}
                  className="party-tile"
                  style={{
                    backgroundColor: `hsl(${t.hue}, 15%, 75%)`,
                    animationDelay: `${t.delay}s`,
                    animationDuration: `${t.duration}s`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stop button */}
      <div
        className="relative z-10 flex flex-col items-center gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mt-[55vh]">
          <Button size="lg" variant="destructive" onClick={onClose}>
            <X className="mr-2 h-4 w-4" />
            Stop festen
          </Button>
        </div>
        <p className="text-xs text-white/60">Klik på baggrunden eller knappen for at lukke</p>
      </div>

      {/* Audio */}
      <audio ref={audioRef} loop preload="auto" style={{ display: "none" }}>
        <source src="/party.mp3" type="audio/mpeg" />
      </audio>

      <style>{`
        @keyframes party-ball-drop {
          0% { transform: translate(-50%, -100%); }
          100% { transform: translate(-50%, 15vh); }
        }
        .party-ball-drop {
          animation: party-ball-drop 1.2s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }
        @keyframes party-ball-spin {
          from { transform: rotateY(0deg); }
          to { transform: rotateY(360deg); }
        }
        .party-ball-spin {
          animation: party-ball-spin 4s linear infinite;
          transform-style: preserve-3d;
        }
        @keyframes party-tile-glint {
          0%, 100% { opacity: 0.5; box-shadow: none; }
          50% { opacity: 1; box-shadow: 0 0 6px rgba(255,255,255,0.9); background-color: #fff; }
        }
        .party-tile {
          animation-name: party-tile-glint;
          animation-iteration-count: infinite;
          animation-timing-function: ease-in-out;
          border-radius: 1px;
        }
        @keyframes party-light-move {
          0%   { transform: translate(0, 0) scale(1); }
          25%  { transform: translate(30vw, -10vh) scale(1.2); }
          50%  { transform: translate(-20vw, 20vh) scale(0.9); }
          75%  { transform: translate(15vw, 25vh) scale(1.1); }
          100% { transform: translate(0, 0) scale(1); }
        }
        .party-light {
          animation: party-light-move 9s ease-in-out infinite;
          mix-blend-mode: screen;
        }
      `}</style>
    </div>
  );
}

export default PartyOverlay;