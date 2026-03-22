import { ReactP5Wrapper } from "@p5-wrapper/react";

function sketch(p) {
  let blobs = [];
  const MAX_BLOBS = 120;

  p.setup = () => {
    p.createCanvas(p.windowWidth, p.windowHeight);
    p.noStroke();
    p.canvas.style.pointerEvents = "none";
  };

  p.draw = () => {
    p.clear();

    // Draw a dark overlay over the full canvas — this dims the landscape
    p.drawingContext.globalCompositeOperation = "source-over";
    p.fill(16, 10, 6, 185);
    p.rect(0, 0, p.width, p.height);

    // Punch holes in the overlay where blobs are — reveals the vivid image underneath
    p.drawingContext.globalCompositeOperation = "destination-out";

    // Keep edges fluid without creating giant visible pools.
    p.drawingContext.filter = "blur(50px)";

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

      const numPoints = 16;
      const noiseScale = 0.35;
      const noiseAmplitude = radius * 0.42;

      // White fill — destination-out uses alpha to erase the dark overlay
      // By using a very soft radial gradient or many circles, we could make it blurrier,
      // but here we use a solid white with the calculated alpha.
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
      // Close the curve
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

    // Reset back to normal for the next frame
    p.drawingContext.filter = "none";
    p.drawingContext.globalCompositeOperation = "source-over";
  };

  function spawnBlob(x, y) {
    if (blobs.length >= MAX_BLOBS) blobs.shift();
    blobs.push({
      x: x + p.random(-12, 12),
      y: y + p.random(-12, 12),
      baseRadius: p.random(40, 70),
      spreadRate: p.random(0.12, 0.3),
      peakAlpha: p.random(30, 60),
      riseFrames: Math.floor(p.random(6, 12)),
      holdFrames: Math.floor(p.random(8, 18)),
      fadeFrames: Math.floor(p.random(20, 36)),
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
        position: "absolute",
        inset: 0,
        zIndex: 2,
        pointerEvents: "none",
      }}
    >
      <ReactP5Wrapper sketch={sketch} />
    </div>
  );
}
