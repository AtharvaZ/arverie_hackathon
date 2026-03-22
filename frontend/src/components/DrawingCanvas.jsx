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
  line: "crosshair",
  rectangle: "crosshair",
  circle: "crosshair",
  triangle: "crosshair",
};

// Pencil and ink are drawn on a live canvas at globalAlpha=1 (fully opaque).
// Overlapping round-lineCap circles at shared segment endpoints become idempotent
// (painting opaque color over opaque color = no change) → no visible dark circles.
// On pointerUp the live canvas is composited onto the permanent canvas at user opacity.
const LIVE_BRUSHES = new Set(["pencil", "ink"]);
const SHAPE_TOOLS = new Set(["line", "rectangle", "circle", "triangle"]);
const PREVIEW_TOOLS = new Set([
  "pencil",
  "ink",
  "line",
  "rectangle",
  "circle",
  "triangle",
]);

function drawShape(ctx, shape, start, end, color, size) {
  const left = Math.min(start.x, end.x);
  const top = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);
  const strokeWidth = Math.max(2, size * 0.35);

  ctx.strokeStyle = color;
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();

  if (shape === "line") {
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    return;
  }

  if (shape === "rectangle") {
    ctx.strokeRect(left, top, width, height);
    return;
  }

  if (shape === "circle") {
    const centerX = (start.x + end.x) / 2;
    const centerY = (start.y + end.y) / 2;
    const radius = Math.max(width, height) / 2;
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();
    return;
  }

  if (shape === "triangle") {
    const apexX = (left + left + width) / 2;
    const apexY = top;
    const rightX = left + width;
    const baseY = top + height;
    ctx.moveTo(apexX, apexY);
    ctx.lineTo(rightX, baseY);
    ctx.lineTo(left, baseY);
    ctx.closePath();
    ctx.stroke();
  }
}

function sampleStrokePoints(points, maxSamples = 12) {
  if (!Array.isArray(points) || points.length === 0) return [];
  if (points.length <= maxSamples) {
    return points.map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) }));
  }
  const step = (points.length - 1) / (maxSamples - 1);
  const sampled = [];
  for (let i = 0; i < maxSamples; i += 1) {
    const idx = Math.round(i * step);
    const p = points[idx];
    sampled.push({ x: Math.round(p.x), y: Math.round(p.y) });
  }
  return sampled;
}

const DrawingCanvas = forwardRef(function DrawingCanvas(
  {
    brush,
    color,
    size,
    opacity,
    onStroke,
    onErase,
    onHistoryChange,
    onHistoryEvent,
  },
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
  const dragStartPoint = useRef(null);
  const strokeMutated = useRef(false);
  const strokeBeforeImage = useRef(null);
  const historyStack = useRef([]);
  const redoStack = useRef([]);

  const notifyHistoryChange = useCallback(() => {
    onHistoryChange?.({
      canUndo: historyStack.current.length > 0,
      canRedo: redoStack.current.length > 0,
    });
  }, [onHistoryChange]);

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
      undo() {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return false;
        const op = historyStack.current.pop();
        if (!op) return false;
        ctx.putImageData(op.before, 0, 0);
        redoStack.current.push(op);
        onHistoryEvent?.({ action: "undo", ...op.telemetry });
        notifyHistoryChange();
        return true;
      },
      redo() {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return false;
        const op = redoStack.current.pop();
        if (!op) return false;
        ctx.putImageData(op.after, 0, 0);
        historyStack.current.push(op);
        onHistoryEvent?.({ action: "redo", ...op.telemetry });
        notifyHistoryChange();
        return true;
      },
      canUndo() {
        return historyStack.current.length > 0;
      },
      canRedo() {
        return redoStack.current.length > 0;
      },
    }),
    [opacity, notifyHistoryChange, onHistoryEvent],
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
      window.dispatchEvent(
        new CustomEvent("arverie:cursor-move", {
          detail: { x: e.clientX, y: e.clientY },
        }),
      );
      isDrawing.current = true;
      lastPoint.current = pos;
      lastTime.current = performance.now();
      strokeStart.current = Date.now();
      strokePoints.current = [pos];
      dragStartPoint.current = pos;
      prevMidPoint.current = null;
      strokeMutated.current = false;
      const mainCtx = canvasRef.current?.getContext("2d");
      if (mainCtx && canvasRef.current) {
        strokeBeforeImage.current = mainCtx.getImageData(
          0,
          0,
          canvasRef.current.width,
          canvasRef.current.height,
        );
      }
      if (PREVIEW_TOOLS.has(brush) && liveCanvasRef.current) {
        const liveCtx = liveCanvasRef.current.getContext("2d");
        liveCtx.clearRect(
          0,
          0,
          liveCanvasRef.current.width,
          liveCanvasRef.current.height,
        );
        liveCanvasRef.current.style.opacity = SHAPE_TOOLS.has(brush)
          ? Math.max(0.65, opacity)
          : opacity;
      }
    },
    [getPos, brush, opacity],
  );

  const handlePointerMove = useCallback(
    (e) => {
      if (!isDrawing.current) return;
      e.preventDefault();
      window.dispatchEvent(
        new CustomEvent("arverie:cursor-move", {
          detail: { x: e.clientX, y: e.clientY },
        }),
      );
      const target = LIVE_BRUSHES.has(brush)
        ? liveCanvasRef.current
        : PREVIEW_TOOLS.has(brush)
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

      if (
        SHAPE_TOOLS.has(brush) &&
        liveCanvasRef.current &&
        dragStartPoint.current
      ) {
        ctx.clearRect(
          0,
          0,
          liveCanvasRef.current.width,
          liveCanvasRef.current.height,
        );
        drawShape(ctx, brush, dragStartPoint.current, pos, color, size);
        strokeMutated.current = true;
        strokePoints.current = [dragStartPoint.current, pos];
        lastPoint.current = pos;
        lastTime.current = now;
        return;
      }

      const currentMid = { x: (prev.x + pos.x) / 2, y: (prev.y + pos.y) / 2 };
      const fromMid = prevMidPoint.current ?? prev;

      switch (brush) {
        case "watercolor":
          drawWatercolor(ctx, pos.x, pos.y, color, size, opacity);
          strokeMutated.current = true;
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
          strokeMutated.current = true;
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
          strokeMutated.current = true;
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
            if (brush === "smudge") {
              if (drawSmudge(ctx, ix, iy, ipx, ipy, size))
                strokeMutated.current = true;
            } else if (drawBlur(ctx, ix, iy, size)) {
              strokeMutated.current = true;
            }
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
          strokeMutated.current = true;
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

    const opId = strokeStart.current || Date.now();

    if (
      PREVIEW_TOOLS.has(brush) &&
      liveCanvasRef.current &&
      canvasRef.current
    ) {
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
      strokeMutated.current = true;
    }

    const pts = strokePoints.current;
    let strokePayload = null;
    let erasePayload = null;
    if (pts.length > 1) {
      const strokeEnd = Date.now();
      const durationMs = Math.max(
        strokeEnd - (strokeStart.current || strokeEnd),
        1,
      );
      const xs = pts.map((p) => p.x);
      const ys = pts.map((p) => p.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      let pathLength = 0;
      for (let i = 1; i < pts.length; i += 1) {
        const a = pts[i - 1];
        const b = pts[i];
        pathLength += Math.hypot(b.x - a.x, b.y - a.y);
      }
      const centroid = {
        x: xs.reduce((a, b) => a + b, 0) / xs.length,
        y: ys.reduce((a, b) => a + b, 0) / ys.length,
      };
      strokePayload = {
        timestamp: strokeStart.current,
        opId,
        brush,
        color,
        opacity,
        size,
        areaCovered: (maxX - minX) * (maxY - minY),
        bounds: { minX, minY, maxX, maxY },
        centroid,
        pointCount: pts.length,
        durationMs,
        pathLength,
        avgSpeedPxPerSec: Number(((pathLength / durationMs) * 1000).toFixed(2)),
        pointSamples: sampleStrokePoints(pts),
      };
      onStroke?.(strokePayload);

      if (brush === "eraser") {
        erasePayload = {
          opId,
          position: pts[pts.length - 1],
          timestamp: Date.now(),
          size,
        };
        onErase?.(erasePayload);
      }
    }

    if (
      strokeMutated.current &&
      strokeBeforeImage.current &&
      canvasRef.current
    ) {
      const mainCtx = canvasRef.current.getContext("2d");
      const afterImage = mainCtx.getImageData(
        0,
        0,
        canvasRef.current.width,
        canvasRef.current.height,
      );
      const telemetry = {
        meta: {
          opId,
          kind: brush === "eraser" ? "erase" : "stroke",
          brush,
        },
        stroke: strokePayload,
        erase: erasePayload,
      };
      historyStack.current.push({
        before: strokeBeforeImage.current,
        after: afterImage,
        telemetry,
      });
      redoStack.current = [];
      onHistoryEvent?.({ action: "push", ...telemetry });
      notifyHistoryChange();
    }

    lastPoint.current = null;
    dragStartPoint.current = null;
    strokePoints.current = [];
    strokeBeforeImage.current = null;
    strokeMutated.current = false;
  }, [
    brush,
    color,
    opacity,
    size,
    onStroke,
    onErase,
    onHistoryEvent,
    notifyHistoryChange,
  ]);

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
