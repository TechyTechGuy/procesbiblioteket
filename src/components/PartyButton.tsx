import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { PartyPopper } from "lucide-react";
import * as Tone from "tone";

// Generate disco-ball tile colors once
const TILES: { cx: number; cy: number; r: number; fill: string }[] = (() => {
  const tiles: { cx: number; cy: number; r: number; fill: string }[] = [];
  const cx = 50;
  const cy = 50;
  const R = 42;
  const palette = ["#c0c0c0", "#e8e8e8", "#9aa0a6", "#f5f5f5", "#b8c2cc", "#d6d8db"];
  for (let lat = -80; lat <= 80; lat += 16) {
    const phi = (lat * Math.PI) / 180;
    const ringR = R * Math.cos(phi);
    const y = cy + R * Math.sin(phi);
    const circumference = 2 * Math.PI * ringR;
    const tileSize = 6;
    const count = Math.max(6, Math.floor(circumference / tileSize));
    for (let i = 0; i < count; i++) {
      const theta = (i / count) * Math.PI * 2;
      const x = cx + ringR * Math.cos(theta);
      // fake 3D shading: tiles "behind" are smaller/darker
      const depth = (Math.cos(theta) + 1) / 2; // 0..1
      const r = 1.6 + depth * 1.2;
      const fill = palette[Math.floor(Math.random() * palette.length)];
      tiles.push({ cx: x, cy: y, r, fill });
    }
  }
  return tiles;
})();

export function PartyButton() {
  const [active, setActive] = useState(false);
  const rotationRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const ballRef = useRef<SVGGElement | null>(null);

  const audioRef = useRef<{
    loop: Tone.Loop;
    bass: Tone.MonoSynth;
    kick: Tone.MembraneSynth;
    hat: Tone.NoiseSynth;
    strings: Tone.PolySynth;
  } | null>(null);
  const stepRef = useRef(0);

  // Continuous rotation
  useEffect(() => {
    if (!active) return;
    const tick = () => {
      rotationRef.current = (rotationRef.current + 1.2) % 360;
      if (ballRef.current) {
        ballRef.current.setAttribute(
          "transform",
          `rotate(${rotationRef.current} 50 50)`,
        );
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active]);

  const stopAudio = async () => {
    const a = audioRef.current;
    if (!a) return;
    try {
      Tone.Transport.stop();
      Tone.Transport.cancel();
      a.loop.dispose();
      a.bass.dispose();
      a.kick.dispose();
      a.hat.dispose();
      a.strings.dispose();
    } catch {
      /* ignore */
    }
    audioRef.current = null;
    stepRef.current = 0;
  };

  useEffect(() => {
    return () => {
      stopAudio();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handleClick = async () => {
    if (active) {
      await stopAudio();
      setActive(false);
      return;
    }

    await Tone.start();

    const bass = new Tone.MonoSynth({
      oscillator: { type: "sawtooth" },
      filter: { Q: 4 },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.2, release: 0.1 },
      filterEnvelope: { attack: 0.01, decay: 0.2, baseFrequency: 200, octaves: 3 },
    }).toDestination();
    bass.volume.value = -10;

    const kick = new Tone.MembraneSynth({
      octaves: 5,
      envelope: { attack: 0.001, decay: 0.3, sustain: 0 },
    }).toDestination();
    kick.volume.value = -4;

    const hat = new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.001, decay: 0.05, sustain: 0 },
    }).toDestination();
    hat.volume.value = -18;

    const strings = new Tone.PolySynth(Tone.Synth).toDestination();
    strings.set({
      oscillator: { type: "sawtooth" },
      envelope: { attack: 0.3, decay: 0.2, sustain: 0.5, release: 0.6 },
    });
    strings.volume.value = -20;

    const bassline = [
      "C2","C2","C3","G2","A2","A2","C3","G2",
      "F2","F2","A2","C3","G2","G2","F2","D2",
    ];
    const chords: string[][] = [
      ["C4","E4","G4"],
      ["A3","C4","E4"],
      ["F3","A3","C4"],
      ["G3","B3","D4"],
    ];

    stepRef.current = 0;
    const loop = new Tone.Loop((time) => {
      const step = stepRef.current;
      const i = step % 16;
      if (i % 2 === 0) kick.triggerAttackRelease("C1", "8n", time);
      if (i % 4 === 2) hat.triggerAttackRelease("16n", time);
      bass.triggerAttackRelease(bassline[i], "8n", time);
      if (i % 4 === 0) {
        strings.triggerAttackRelease(chords[Math.floor(step / 4) % 4], "2n", time);
      }
      stepRef.current = step + 1;
    }, "8n");

    Tone.Transport.bpm.value = 120;
    loop.start(0);
    Tone.Transport.start();

    audioRef.current = { loop, bass, kick, hat, strings };
    setActive(true);
  };

  return (
    <>
      <Button
        size="sm"
        variant={active ? "destructive" : "outline"}
        onClick={handleClick}
      >
        <PartyPopper className="mr-2 h-3 w-3" />
        {active ? "Stop festen" : "Fest!"}
      </Button>

      {/* Dim overlay */}
      <div
        aria-hidden
        className={
          "pointer-events-none fixed inset-0 z-[60] bg-black transition-opacity duration-700 " +
          (active ? "opacity-60" : "opacity-0")
        }
      />

      {/* Disco ball */}
      <div
        aria-hidden
        className="pointer-events-none fixed left-1/2 top-0 z-[61] -translate-x-1/2 transition-transform duration-[1200ms] ease-in-out"
        style={{
          transform: active
            ? "translate(-50%, 35vh)"
            : "translate(-50%, -120%)",
        }}
      >
        <svg
          width="220"
          height="260"
          viewBox="0 0 100 120"
          style={{ overflow: "visible" }}
        >
          {/* Cable */}
          <line x1="50" y1="-200" x2="50" y2="8" stroke="#888" strokeWidth="0.4" />
          {/* Top mount */}
          <rect x="46" y="4" width="8" height="4" fill="#666" rx="0.5" />
          {/* Glow */}
          <defs>
            <radialGradient id="discoGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fff" stopOpacity="0.5" />
              <stop offset="60%" stopColor="#fff" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#fff" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="48" fill="url(#discoGlow)" />
          {/* Rotating tiles */}
          <g ref={ballRef}>
            <circle cx="50" cy="50" r="42" fill="#3a3f47" />
            {TILES.map((t, i) => (
              <circle key={i} cx={t.cx} cy={t.cy} r={t.r} fill={t.fill} opacity={0.9} />
            ))}
            {/* Specular highlight */}
            <ellipse cx="36" cy="36" rx="10" ry="6" fill="#fff" opacity="0.35" />
          </g>
        </svg>
      </div>
    </>
  );
}

export default PartyButton;