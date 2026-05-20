import { useEffect, useRef } from "react";

type CandleDef = {
  xr: number;
  yr: number;
  hr: number;
  w: number;
  phase: number;
};

const candleDefs: CandleDef[] = [
  { xr: 0.04, yr: 0.84, hr: 0.24, w: 16, phase: 0.0 },
  { xr: 0.11, yr: 0.89, hr: 0.17, w: 11, phase: 1.1 },
  { xr: 0.19, yr: 0.86, hr: 0.21, w: 13, phase: 0.5 },
  { xr: 0.81, yr: 0.86, hr: 0.21, w: 13, phase: 0.7 },
  { xr: 0.89, yr: 0.89, hr: 0.17, w: 11, phase: 1.6 },
  { xr: 0.96, yr: 0.84, hr: 0.24, w: 16, phase: 0.3 },
];

const stars = Array.from({ length: 70 }, () => ({
  xr: Math.random(),
  yr: Math.random() * 0.72,
  r: Math.random() * 1.3 + 0.3,
  a: Math.random() * 0.55 + 0.2,
  sp: Math.random() * 0.018 + 0.004,
  ph: Math.random() * Math.PI * 2,
}));

function flicker(phase: number, t: number) {
  return (
    Math.sin(t * 3.1 + phase) * 0.28 +
    Math.sin(t * 7.3 + phase * 1.7) * 0.14 +
    Math.sin(t * 13.7 + phase * 0.9) * 0.06 +
    1.0
  );
}

export function Candles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId = 0;
    let time = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const W = () => window.innerWidth;
    const H = () => window.innerHeight;

    const drawCandle = (candle: CandleDef, t: number) => {
      const x = candle.xr * W();
      const baseY = candle.yr * H();
      const ch = candle.hr * H();
      const w = candle.w;
      const fk = flicker(candle.phase, t);
      const fh = (20 + fk * 9) * (w / 16);
      const fw = (8 + fk * 3.5) * (w / 16);
      const tipY = baseY - ch - fh;

      ctx.fillStyle = "#ece3c0";
      ctx.beginPath();
      ctx.roundRect(x - w / 2, baseY - ch, w, ch, 2);
      ctx.fill();

      const bodyShade = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
      bodyShade.addColorStop(0, "rgba(255,255,255,0.08)");
      bodyShade.addColorStop(0.35, "rgba(255,255,255,0.0)");
      bodyShade.addColorStop(1, "rgba(0,0,0,0.18)");
      ctx.fillStyle = bodyShade;
      ctx.beginPath();
      ctx.roundRect(x - w / 2, baseY - ch, w, ch, 2);
      ctx.fill();

      ctx.fillStyle = "rgba(236,227,192,0.5)";
      ctx.beginPath();
      ctx.ellipse(x - w * 0.15, baseY - ch + 4, 2.5, 6, 0.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#3a2a18";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, baseY - ch);
      ctx.quadraticCurveTo(x + 2, baseY - ch - 5, x + 1, baseY - ch - 9);
      ctx.stroke();

      const gr = (60 + fk * 22) * (w / 16);
      const glow = ctx.createRadialGradient(x, tipY + 6, 0, x, tipY + 6, gr);
      glow.addColorStop(0, `rgba(212,180,106,${0.14 * fk})`);
      glow.addColorStop(0.35, `rgba(184,146,46,${0.07 * fk})`);
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.ellipse(x, tipY + 6, gr, gr * 0.65, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x, tipY);
      ctx.bezierCurveTo(
        x + fw * (0.55 + (fk - 1) * 0.3),
        tipY + fh * 0.3,
        x + fw * 0.65,
        tipY + fh * 0.7,
        x,
        tipY + fh,
      );
      ctx.bezierCurveTo(
        x - fw * 0.65,
        tipY + fh * 0.7,
        x - fw * (0.55 + (fk - 1) * 0.3),
        tipY + fh * 0.3,
        x,
        tipY,
      );
      ctx.closePath();
      const fg = ctx.createLinearGradient(x, tipY, x, tipY + fh);
      fg.addColorStop(0, `rgba(255,255,210,${0.96 * fk})`);
      fg.addColorStop(0.2, `rgba(255,210,70,${0.93 * fk})`);
      fg.addColorStop(0.6, `rgba(255,100,20,${0.87 * fk})`);
      fg.addColorStop(1, `rgba(200,40,0,${0.72 * fk})`);
      ctx.fillStyle = fg;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(x, tipY + 5);
      ctx.bezierCurveTo(x + fw * 0.28, tipY + fh * 0.4, x + fw * 0.32, tipY + fh * 0.72, x, tipY + fh);
      ctx.bezierCurveTo(x - fw * 0.32, tipY + fh * 0.72, x - fw * 0.28, tipY + fh * 0.4, x, tipY + 5);
      ctx.closePath();
      const ig = ctx.createLinearGradient(x, tipY + 5, x, tipY + fh);
      ig.addColorStop(0, `rgba(255,255,255,${0.75 * fk})`);
      ig.addColorStop(0.5, `rgba(255,240,160,${0.4 * fk})`);
      ig.addColorStop(1, "rgba(255,200,80,0)");
      ctx.fillStyle = ig;
      ctx.fill();
      ctx.restore();

      const floorGlow = ctx.createRadialGradient(x, baseY, 0, x, baseY, 55);
      floorGlow.addColorStop(0, `rgba(212,180,106,${0.09 * fk})`);
      floorGlow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = floorGlow;
      ctx.beginPath();
      ctx.ellipse(x, baseY, 55, 16, 0, 0, Math.PI * 2);
      ctx.fill();
    };

    const drawStars = (t: number) => {
      stars.forEach((star) => {
        const alpha = star.a * (0.6 + 0.4 * Math.sin(t * star.sp * 60 + star.ph));
        ctx.fillStyle = `rgba(255,255,245,${alpha})`;
        ctx.beginPath();
        ctx.arc(star.xr * W(), star.yr * H(), star.r, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    const draw = () => {
      ctx.clearRect(0, 0, W(), H());

      const bg = ctx.createLinearGradient(0, 0, 0, H());
      bg.addColorStop(0, "#0e0d24");
      bg.addColorStop(0.5, "#13122c");
      bg.addColorStop(1, "#191730");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W(), H());

      drawStars(time);
      candleDefs.forEach((candle) => drawCandle(candle, time));
      time += 0.016;
      animationFrameId = window.requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      window.cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none" />;
}

export default Candles;