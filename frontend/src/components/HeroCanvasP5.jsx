import { ReactP5Wrapper } from "@p5-wrapper/react";

function sketch(p) {
  let blobs = [];
  const MAX_BLOBS = 120;
  const SAFARI_SPAWN_INTERVAL_MS = 42;
  let lastSafariSpawnAt = 0;
  const isSafari =
    typeof navigator !== "undefined" &&
    /safari/i.test(navigator.userAgent) &&
    /apple/i.test(navigator.vendor || "") &&
    !/chrome|chromium|android|crios|fxios|edgios|opios/i.test(
      navigator.userAgent,
    );

  p.setup = () => {
    p.createCanvas(p.windowWidth, p.windowHeight);
    p.noStroke();
    p.canvas.style.pointerEvents = "none";
  };

  p.draw = () => {
    p.clear();

    // Draw a dark overlay over the full canvas — this dims the landscape
    p.drawingContext.globalCompositeOperation = "source-over";
    // Safari tends to render this dimming pass lighter than Chromium.
    p.fill(16, 10, 6, isSafari ? 212 : 185);
    p.rect(0, 0, p.width, p.height);

    // Punch holes in the overlay where blobs are — reveals the vivid image underneath
    p.drawingContext.globalCompositeOperation = "destination-out";

    // Safari renders destination-out + canvas filter differently; use
    // a softer layered fallback there to avoid sharp pointer blobs.
    p.drawingContext.filter = isSafari ? "blur(16px)" : "blur(50px)";

    for (let i = blobs.length - 1; i >= 0; i--) {
      const b = blobs[i];
      b.age++;

      let alpha;
      if (b.age < b.riseFrames) {
        alpha = p.map(b.age, 0, b.riseFrames, 0, b.peakAlpha);
      } else if (b.age < b.riseFrames + b.holdFrames) {
        alpha = b.peakAlpha;
      } else {
        const fadeAge = b.age - b.riseFrames - b.holdFrames;
        alpha = p.map(fadeAge, 0, b.fadeFrames, b.peakAlpha, 0);
      }

      const radius = b.baseRadius + b.age * b.spreadRate;

      if (alpha <= 0 || b.age > b.riseFrames + b.holdFrames + b.fadeFrames) {
        blobs.splice(i, 1);
        continue;
      }

      if (isSafari) {
        p.fill(255, 255, 255, alpha * 0.78);
        p.ellipse(b.x, b.y, radius * 2.2, radius * 2.2);
        p.fill(255, 255, 255, alpha * 0.54);
        p.ellipse(b.x, b.y, radius * 3.0, radius * 3.0);
        p.fill(255, 255, 255, alpha * 0.34);
        p.ellipse(b.x, b.y, radius * 3.8, radius * 3.8);
      } else {
        const numPoints = 16;
        const noiseScale = 0.35;
        const noiseAmplitude = radius * 0.42;

        p.fill(255, 255, 255, alpha);
        p.beginShape();
        for (let j = 0; j < numPoints; j++) {
          const angle = (j / numPoints) * p.TWO_PI;
          const noiseVal = p.noise(
            b.noiseOffset + Math.cos(angle) * noiseScale,
            b.noiseOffset + Math.sin(angle) * noiseScale,
            b.age * 0.006,
          );
          const r = radius + (noiseVal - 0.5) * 2 * noiseAmplitude;
          p.curveVertex(b.x + Math.cos(angle) * r, b.y + Math.sin(angle) * r);
        }
        for (let j = 0; j < 3; j++) {
          const angle = (j / numPoints) * p.TWO_PI;
          const noiseVal = p.noise(
            b.noiseOffset + Math.cos(angle) * noiseScale,
            b.noiseOffset + Math.sin(angle) * noiseScale,
            b.age * 0.006,
          );
          const r = radius + (noiseVal - 0.5) * 2 * noiseAmplitude;
          p.curveVertex(b.x + Math.cos(angle) * r, b.y + Math.sin(angle) * r);
        }
        p.endShape(p.CLOSE);
      }
    }

    // Reset back to normal for the next frame
    p.drawingContext.filter = "none";
    p.drawingContext.globalCompositeOperation = "source-over";
  };

  function spawnBlob(x, y) {
    if (isSafari) {
      const now = performance.now();
      if (now - lastSafariSpawnAt < SAFARI_SPAWN_INTERVAL_MS) return;
      lastSafariSpawnAt = now;
    }
    if (blobs.length >= MAX_BLOBS) blobs.shift();
    blobs.push({
      x: x + p.random(isSafari ? -5 : -12, isSafari ? 5 : 12),
      y: y + p.random(isSafari ? -5 : -12, isSafari ? 5 : 12),
      baseRadius: p.random(isSafari ? 52 : 40, isSafari ? 84 : 70),
      spreadRate: p.random(isSafari ? 0.08 : 0.12, isSafari ? 0.18 : 0.3),
      peakAlpha: p.random(isSafari ? 30 : 30, isSafari ? 52 : 60),
      riseFrames: Math.floor(p.random(6, 12)),
      holdFrames: Math.floor(p.random(8, 18)),
      fadeFrames: Math.floor(p.random(isSafari ? 34 : 20, isSafari ? 56 : 36)),
      noiseOffset: p.random(1000),
      age: 0,
    });
  }

  p.mouseMoved = () => {
    spawnBlob(p.mouseX, p.mouseY);
  };
  p.mouseDragged = () => {
    spawnBlob(p.mouseX, p.mouseY);
  };
  p.touchMoved = () => {
    for (let t of p.touches) spawnBlob(t.x, t.y);
    return false;
  };

  p.windowResized = () => {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
  };
}

export default function HeroCanvasP5() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1,
        pointerEvents: "none",
      }}
    >
      <ReactP5Wrapper sketch={sketch} />
    </div>
  );
}
