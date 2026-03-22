import {
  useRef,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  drawWatercolor,
  drawPencil,
  drawInk,
  drawSmudge,
  drawBlur,
  drawEraser,
} from "../utils/brushes";

const CURSOR = {
  watercolor: "crosshair",
  pencil: "crosshair",
  ink: "crosshair",
  smudge: "cell",
  blur: "cell",
  eraser: "cell",
};

// Pencil and ink are drawn on a live canvas at globalAlpha=1 (fully opaque).
// Overlapping round-lineCap circles at shared segment endpoints become idempotent
// (painting opaque color over opaque color = no change) → no visible dark circles.
// On pointerUp the live canvas is composited onto the permanent canvas at user opacity.
const LIVE_BRUSHES = new Set(["pencil", "ink"]);

const DrawingCanvas = forwardRef(function DrawingCanvas(
  { brush, color, size, opacity, onStroke, onErase },
  ref,
) {
  const canvasRef = useRef(null); // permanent strokes
  const liveCanvasRef = useRef(null); // current pencil/ink stroke
  const isDrawing = useRef(false);
  const lastPoint = useRef(null);
  const lastTime = useRef(null);
  const strokeStart = useRef(null);
  const strokePoints = useRef([]);
  const prevMidPoint = useRef(null);

  // Expose imperative API for getDataURL (composited with parchment bg)
  useImperativeHandle(
    ref,
    () => ({
      getDataURL() {
        const canvas = canvasRef.current;
        const live = liveCanvasRef.current;
        if (!canvas) return null;
        const tmp = document.createElement("canvas");
        tmp.width = canvas.width;
        tmp.height = canvas.height;
        const tctx = tmp.getContext("2d");
        tctx.fillStyle = "#faf2de";
        tctx.fillRect(0, 0, tmp.width, tmp.height);
        tctx.drawImage(canvas, 0, 0);
        if (live) {
          tctx.globalAlpha = opacity;
          tctx.drawImage(live, 0, 0);
          tctx.globalAlpha = 1;
        }
        return tmp.toDataURL("image/png");
      },
    }),
    [opacity],
  );

  // Set canvas buffer size once on mount — never reassign width/height (clears canvas).
  // CSS 100%/100% fills the container regardless of layout shifts (e.g. AI panel animation).
  useEffect(() => {
    const canvas = canvasRef.current;
    const live = liveCanvasRef.current;
    if (!canvas || !live) return;
    const container = canvas.parentElement;
    canvas.width = live.width = container.offsetWidth;
    canvas.height = live.height = container.offsetHeight;
    canvas.style.width = live.style.width = "100%";
    canvas.style.height = live.style.height = "100%";
  }, []);

  // Map pointer event → canvas-local coordinates
  const getPos = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  const handlePointerDown = useCallback(
    (e) => {
      e.preventDefault();
      canvasRef.current.setPointerCapture(e.pointerId);
      const pos = getPos(e);
      isDrawing.current = true;
      lastPoint.current = pos;
      lastTime.current = performance.now();
      strokeStart.current = Date.now();
      strokePoints.current = [pos];
      prevMidPoint.current = null;
      if (LIVE_BRUSHES.has(brush) && liveCanvasRef.current) {
        const liveCtx = liveCanvasRef.current.getContext("2d");
        liveCtx.clearRect(
          0,
          0,
          liveCanvasRef.current.width,
          liveCanvasRef.current.height,
        );
        liveCanvasRef.current.style.opacity = opacity;
      }
    },
    [getPos, brush, opacity],
  );

  const handlePointerMove = useCallback(
    (e) => {
      if (!isDrawing.current) return;
      e.preventDefault();
      const target = LIVE_BRUSHES.has(brush)
        ? liveCanvasRef.current
        : canvasRef.current;
      const ctx = target?.getContext("2d");
      if (!ctx) return;

      const pos = getPos(e);
      const prev = lastPoint.current;
      const now = performance.now();
      const dt = Math.max(now - lastTime.current, 1);
      const dist = Math.hypot(pos.x - prev.x, pos.y - prev.y);
      const speed = dist / dt; // px/ms

      const currentMid = { x: (prev.x + pos.x) / 2, y: (prev.y + pos.y) / 2 };
      const fromMid = prevMidPoint.current ?? prev;

      switch (brush) {
        case "watercolor":
          drawWatercolor(ctx, pos.x, pos.y, color, size, opacity);
          break;
        case "pencil":
          // opacity=1 on live canvas — idempotent overlapping caps → no circles
          drawPencil(
            ctx,
            fromMid.x,
            fromMid.y,
            prev.x,
            prev.y,
            currentMid.x,
            currentMid.y,
            color,
            size,
            1,
          );
          break;
        case "ink":
          drawInk(
            ctx,
            fromMid.x,
            fromMid.y,
            prev.x,
            prev.y,
            currentMid.x,
            currentMid.y,
            color,
            size,
            1,
            speed,
          );
          break;
        case "smudge":
        case "blur": {
          const steps = Math.min(8, Math.max(1, Math.floor(dist / 4)));
          for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            const tp = (i - 1) / steps;
            const ix = prev.x + (pos.x - prev.x) * t;
            const iy = prev.y + (pos.y - prev.y) * t;
            const ipx = prev.x + (pos.x - prev.x) * tp;
            const ipy = prev.y + (pos.y - prev.y) * tp;
            if (brush === "smudge") drawSmudge(ctx, ix, iy, ipx, ipy, size);
            else drawBlur(ctx, ix, iy, size);
          }
          break;
        }
        case "eraser": {
          const steps = Math.min(8, Math.max(1, Math.floor(dist / 4)));
          for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            const ix = prev.x + (pos.x - prev.x) * t;
            const iy = prev.y + (pos.y - prev.y) * t;
            drawEraser(ctx, ix, iy, size);
          }
          onErase?.({ position: pos, timestamp: Date.now(), size });
          break;
        }
        default:
          break;
      }

      prevMidPoint.current = currentMid;
      strokePoints.current.push(pos);
      lastPoint.current = pos;
      lastTime.current = now;
    },
    [brush, color, size, opacity, getPos, onErase],
  );

  const handlePointerUp = useCallback(() => {
    if (!isDrawing.current) return;
    isDrawing.current = false;

    if (LIVE_BRUSHES.has(brush) && liveCanvasRef.current && canvasRef.current) {
      // Composite live stroke onto permanent canvas at user opacity
      const mainCtx = canvasRef.current.getContext("2d");
      mainCtx.globalAlpha = opacity;
      mainCtx.drawImage(liveCanvasRef.current, 0, 0);
      mainCtx.globalAlpha = 1;
      // Clear live canvas
      const liveCtx = liveCanvasRef.current.getContext("2d");
      liveCtx.clearRect(
        0,
        0,
        liveCanvasRef.current.width,
        liveCanvasRef.current.height,
      );
      liveCanvasRef.current.style.opacity = 1;
    }

    const pts = strokePoints.current;
    if (pts.length > 1) {
      const xs = pts.map((p) => p.x);
      const ys = pts.map((p) => p.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      const centroid = {
        x: xs.reduce((a, b) => a + b, 0) / xs.length,
        y: ys.reduce((a, b) => a + b, 0) / ys.length,
      };
      onStroke?.({
        timestamp: strokeStart.current,
        brush,
        color,
        opacity,
        size,
        areaCovered: (maxX - minX) * (maxY - minY),
        bounds: { minX, minY, maxX, maxY },
        centroid,
        pointCount: pts.length,
      });
    }

    lastPoint.current = null;
    strokePoints.current = [];
  }, [brush, color, opacity, size, onStroke]);

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          touchAction: "none",
          cursor: CURSOR[brush] ?? "crosshair",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
      {/* Live canvas for in-progress pencil/ink strokes — sits on top, no pointer events */}
      <canvas
        ref={liveCanvasRef}
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
        }}
      />
    </>
  );
});

export default DrawingCanvas;
