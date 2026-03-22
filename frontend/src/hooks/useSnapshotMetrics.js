/**
 * Computes a 7-second behavioral snapshot from raw canvas data.
 * Returns the exact shape expected by POST /session/canvas-snapshot.
 */
export function computeSnapshot(
  behaviorData,
  canvasWidth,
  canvasHeight,
  sessionStartMs,
) {
  const now = Date.now();
  const elapsed = (now - sessionStartMs) / 1000;
  const windowMs = 7000;
  const windowStart = now - windowMs;

  const strokes = behaviorData.strokes || [];
  const erasures = behaviorData.erasures || [];
  const colorChanges = behaviorData.colorChanges || [];

  // Strokes in the last 7 seconds
  const recentStrokes = strokes.filter((s) => s.timestamp >= windowStart);
  const strokesPerSecond = recentStrokes.length / 7;

  // Current color: last color change, or default
  const currentColor =
    colorChanges.length > 0
      ? colorChanges[colorChanges.length - 1].to
      : "#1d1d1d";

  // Colors used in the last 7 seconds
  const recentColorChanges = colorChanges.filter(
    (c) => c.timestamp >= windowStart,
  );
  const colorsInWindow = Array.from(
    new Set([
      ...(recentColorChanges.length > 0
        ? recentColorChanges.map((c) => c.to)
        : []),
      currentColor,
    ]),
  );

  // Erase events in the last 7 seconds — convert to backend format
  const recentErasures = erasures.filter((e) => e.timestamp >= windowStart);
  const eraseEvents = recentErasures.map((e) => ({
    timestamp: (e.timestamp - sessionStartMs) / 1000,
    x: Math.round(e.position?.x ?? 0),
    y: Math.round(e.position?.y ?? 0),
    radius: Math.round(e.size ?? 20),
  }));

  // Quadrant distribution — keys must match backend QuadrantDistribution model (underscores)
  const quadrantCounts = {
    top_left: 0,
    top_right: 0,
    bottom_left: 0,
    bottom_right: 0,
  };

  if (recentStrokes.length > 0 && canvasWidth > 0 && canvasHeight > 0) {
    // Use stroke centroids when available for real positional weighting.
    for (const stroke of recentStrokes) {
      const cx = stroke.centroid?.x;
      const cy = stroke.centroid?.y;
      if (typeof cx !== "number" || typeof cy !== "number") continue;
      const left = cx < canvasWidth / 2;
      const top = cy < canvasHeight / 2;
      const key = `${top ? "top" : "bottom"}_${left ? "left" : "right"}`;
      quadrantCounts[key] = (quadrantCounts[key] || 0) + 1;
    }
  }

  // Use erase events (which DO have position) to refine quadrant distribution
  const positionedEvents = [
    ...recentErasures.map((e) => ({
      x: e.position?.x ?? 0,
      y: e.position?.y ?? 0,
    })),
  ];
  if (positionedEvents.length > 0 && canvasWidth > 0 && canvasHeight > 0) {
    // Reset and recompute from positioned events
    for (const k of Object.keys(quadrantCounts)) quadrantCounts[k] = 0;
    for (const { x, y } of positionedEvents) {
      const left = x < canvasWidth / 2;
      const top = y < canvasHeight / 2;
      const key = `${top ? "top" : "bottom"}_${left ? "left" : "right"}`;
      quadrantCounts[key] = (quadrantCounts[key] || 0) + 1;
    }
    // If we also have strokes, blend 50/50
    if (recentStrokes.length > 0) {
      const totalPos = positionedEvents.length;
      const totalStr = recentStrokes.length;
      const combined = totalPos + totalStr;
      for (const k of Object.keys(quadrantCounts)) {
        const posShare = (quadrantCounts[k] / totalPos) * (totalPos / combined);
        const strShare = 0.25 * (totalStr / combined);
        quadrantCounts[k] = posShare + strShare;
      }
    } else {
      // Normalize
      const total = Object.values(quadrantCounts).reduce((a, b) => a + b, 0);
      if (total > 0) {
        for (const k of Object.keys(quadrantCounts)) {
          quadrantCounts[k] = quadrantCounts[k] / total;
        }
      } else {
        for (const k of Object.keys(quadrantCounts)) quadrantCounts[k] = 0.25;
      }
    }
  } else if (Object.values(quadrantCounts).reduce((a, b) => a + b, 0) === 0) {
    // No data — equal distribution
    for (const k of Object.keys(quadrantCounts)) quadrantCounts[k] = 0.25;
  } else {
    // Normalize stroke-only distribution
    const total = Object.values(quadrantCounts).reduce((a, b) => a + b, 0);
    if (total > 0) {
      for (const k of Object.keys(quadrantCounts)) {
        quadrantCounts[k] = quadrantCounts[k] / total;
      }
    }
  }

  // Last stroke timestamp in seconds from session start
  const lastStroke = strokes.length > 0 ? strokes[strokes.length - 1] : null;
  const lastStrokeTimestamp = lastStroke
    ? (lastStroke.timestamp - sessionStartMs) / 1000
    : 0;

  return {
    strokes_per_second: Math.round(strokesPerSecond * 100) / 100,
    stroke_count_window: recentStrokes.length,
    current_color: currentColor,
    colors_used_this_window: colorsInWindow,
    erase_events: eraseEvents,
    erase_count_window: eraseEvents.length,
    quadrant_distribution: quadrantCounts,
    last_stroke_timestamp: Math.round(lastStrokeTimestamp * 100) / 100,
    elapsed_seconds: Math.round(elapsed * 100) / 100,
  };
}

/**
 * Builds the canvas_summary for POST /session/end from all accumulated behavioral data.
 */
export function buildCanvasSummary(
  behaviorData,
  canvasWidth,
  canvasHeight,
  sessionStartMs,
) {
  const totalSeconds = (Date.now() - sessionStartMs) / 1000;
  const strokes = behaviorData.strokes || [];
  const erasures = behaviorData.erasures || [];
  const colorChanges = behaviorData.colorChanges || [];

  // All unique colors
  const allColors = Array.from(
    new Set([
      ...colorChanges.map((c) => c.to),
      ...strokes.map((s) => s.color).filter(Boolean),
    ]),
  );

  // Erasure clusters — group by quadrant label
  const clusterLabels = [];
  if (erasures.length > 0 && canvasWidth > 0 && canvasHeight > 0) {
    const quadrantCounts = {};
    for (const e of erasures) {
      const x = e.position?.x ?? 0;
      const y = e.position?.y ?? 0;
      const left = x < canvasWidth / 2;
      const top = y < canvasHeight / 2;
      const label = `${top ? "upper" : "lower"}_${left ? "left" : "right"}`;
      quadrantCounts[label] = (quadrantCounts[label] || 0) + 1;
    }
    // Only include quadrants with >1 erase
    for (const [label, count] of Object.entries(quadrantCounts)) {
      if (count > 1) clusterLabels.push(label);
    }
  }

  // Time in quadrants — aggregate from all stroke positions (using uniform distribution since DrawingCanvas doesn't expose stroke positions)
  const timeInQuadrants = {
    top_left: 0.25,
    top_right: 0.25,
    bottom_left: 0.25,
    bottom_right: 0.25,
  };

  // Refine using erasure positions (which do have x/y)
  if (erasures.length > 0 && canvasWidth > 0 && canvasHeight > 0) {
    const qCount = {
      top_left: 0,
      top_right: 0,
      bottom_left: 0,
      bottom_right: 0,
    };
    for (const e of erasures) {
      const x = e.position?.x ?? 0;
      const y = e.position?.y ?? 0;
      const key = `${y < canvasHeight / 2 ? "top" : "bottom"}_${x < canvasWidth / 2 ? "left" : "right"}`;
      qCount[key]++;
    }
    const total = Object.values(qCount).reduce((a, b) => a + b, 0);
    if (total > 0) {
      for (const k of Object.keys(timeInQuadrants)) {
        timeInQuadrants[k] = Math.round((qCount[k] / total) * 100) / 100;
      }
    }
  }

  // Dominant area
  const dominantArea = Object.entries(timeInQuadrants).reduce((a, b) =>
    b[1] > a[1] ? b : a,
  )[0];

  // Stroke speed events — detect surges (strokes where size/area was notably large)
  const speedEvents = [];
  if (strokes.length > 2) {
    const areas = strokes.map((s) => s.areaCovered || 0);
    const avg = areas.reduce((a, b) => a + b, 0) / areas.length;
    for (const s of strokes) {
      if (s.areaCovered > avg * 2) {
        const t = Math.round((s.timestamp - sessionStartMs) / 1000);
        const mm = String(Math.floor(t / 60)).padStart(1, "0");
        const ss = String(t % 60).padStart(2, "0");
        speedEvents.push(`surge at ${mm}:${ss}`);
      }
    }
  }

  return {
    colors_used: allColors,
    erasure_count: erasures.length,
    erasure_clusters: clusterLabels,
    time_in_quadrants: timeInQuadrants,
    total_time_seconds: Math.round(totalSeconds),
    stroke_speed_events: speedEvents.slice(0, 5),
    dominant_area: dominantArea,
  };
}
