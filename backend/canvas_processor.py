import time
import math
import random
import logging
from models import TriggerResult

logger = logging.getLogger(__name__)

SIGNAL_WEIGHTS = {
    "erase_loop": 3.0,
    "erase_localized": 2.0,
    "stroke_surge": 3.0,
    "inactivity": 2.0,
    "color_shift": 2.0,
    "quadrant_focus": 2.0,
    "check_in": 1.5,
}

FLOW_COST = {"high": 7.0, "medium": 3.0, "low": 1.0}
COOLDOWN_PENALTY = 10.0
TRIGGER_THRESHOLD = 5.0
DECAY_RATE = 0.85
COOLDOWN_SECONDS = 90
CHECK_IN_MIN_SECONDS = 120
CHECK_IN_MAX_SECONDS = 180


class CanvasEventProcessor:
    def __init__(self) -> None:
        self.signal_scores: dict[str, float] = {}
        self.last_trigger_time: float = 0.0
        self.check_in_target: float = random.uniform(CHECK_IN_MIN_SECONDS, CHECK_IN_MAX_SECONDS)
        self.flow_intensity: str = "medium"
        self.stroke_baseline: float = 0.0
        self.baseline_samples: list[float] = []
        self.erase_history: list[dict] = []  # {timestamp, x, y}
        self.color_history: list[tuple[str, float]] = []  # (color, timestamp)
        self.quadrant_history: list[tuple[dict, float]] = []  # (distribution, timestamp)
        self._last_elapsed: float = 0.0
        self._latest_snapshot_stats: dict = {}

    def update(self, snapshot: dict) -> TriggerResult:
        # Decay ALWAYS runs before processing new events
        self._decay_signals()
        self._process_snapshot(snapshot)
        return self.should_trigger()

    def should_trigger(self) -> TriggerResult:
        in_cooldown = (time.time() - self.last_trigger_time) < COOLDOWN_SECONDS
        # Timed check-ins should be dependable every 2-3 minutes when not cooling down.
        if not in_cooldown and self.signal_scores.get("check_in", 0) >= SIGNAL_WEIGHTS["check_in"]:
            return TriggerResult(
                should_fire=True,
                dominant_signal="check_in",
                signal_context=self.get_signal_context(),
                flow_intensity=self.flow_intensity,
            )

        cost = FLOW_COST.get(self.flow_intensity, 3.0) + (COOLDOWN_PENALTY if in_cooldown else 0)
        total = sum(self.signal_scores.values())

        if total - cost > TRIGGER_THRESHOLD:
            dominant = (
                max(self.signal_scores, key=self.signal_scores.get)
                if self.signal_scores
                else None
            )
            return TriggerResult(
                should_fire=True,
                dominant_signal=dominant,
                signal_context=self.get_signal_context(),
                flow_intensity=self.flow_intensity,
            )
        return TriggerResult(should_fire=False, flow_intensity=self.flow_intensity)

    def reset_after_trigger(self) -> None:
        # Must reset BOTH signal scores AND last_trigger_time
        self.signal_scores.clear()
        self.last_trigger_time = time.time()
        self.check_in_target = self._last_elapsed + random.uniform(
            CHECK_IN_MIN_SECONDS,
            CHECK_IN_MAX_SECONDS,
        )

    def get_signal_context(self) -> dict:
        return {
            "signal_scores": dict(self.signal_scores),
            "flow_intensity": self.flow_intensity,
            "total_signal": sum(self.signal_scores.values()),
            "snapshot_stats": dict(self._latest_snapshot_stats),
        }

    def _decay_signals(self) -> None:
        to_delete = []
        for signal in list(self.signal_scores.keys()):
            self.signal_scores[signal] *= DECAY_RATE
            if self.signal_scores[signal] < 0.1:
                to_delete.append(signal)
        for signal in to_delete:
            del self.signal_scores[signal]

    def _process_snapshot(self, snapshot: dict) -> None:
        sps = snapshot.get("strokes_per_second", 0.0)
        current_color = snapshot.get("current_color", "#000000")
        erase_events = snapshot.get("erase_events", [])
        quadrant_dist = snapshot.get("quadrant_distribution", {})
        last_stroke_ts = snapshot.get("last_stroke_timestamp", 0.0)
        elapsed = snapshot.get("elapsed_seconds", 0.0)
        self._last_elapsed = elapsed
        self._latest_snapshot_stats = {
            "strokes_per_second": round(float(sps or 0.0), 2),
            "erase_events_window": len(erase_events),
            "colors_window": len(snapshot.get("colors_used_this_window", []) or []),
            "elapsed_seconds": round(float(elapsed or 0.0), 2),
        }

        # Update flow intensity based on strokes per second
        if sps > 3.0:
            self.flow_intensity = "high"
        elif sps > 1.0:
            self.flow_intensity = "medium"
        else:
            self.flow_intensity = "low"

        # Update rolling stroke baseline
        if sps > 0:
            self.baseline_samples.append(sps)
            if len(self.baseline_samples) > 20:
                self.baseline_samples.pop(0)
            self.stroke_baseline = sum(self.baseline_samples) / len(self.baseline_samples)

        # Store erase events with timestamp
        for ev in erase_events:
            self.erase_history.append(
                {
                    "timestamp": ev.get("timestamp", elapsed),
                    "x": ev.get("x", 0),
                    "y": ev.get("y", 0),
                }
            )
        # Keep only last 60 seconds of erase history
        cutoff = elapsed - 60
        self.erase_history = [e for e in self.erase_history if e["timestamp"] > cutoff]

        # Color history — keep last 60 seconds
        if current_color:
            self.color_history.append((current_color, elapsed))
        self.color_history = [(c, t) for c, t in self.color_history if t > elapsed - 60]

        # Quadrant history — keep last 90 seconds
        if quadrant_dist:
            self.quadrant_history.append((quadrant_dist, elapsed))
        self.quadrant_history = [
            (q, t) for q, t in self.quadrant_history if t > elapsed - 90
        ]

        # Run all signal detectors
        self._detect_erase_loop(elapsed)
        self._detect_erase_localized()
        self._detect_stroke_surge(sps)
        self._detect_inactivity(last_stroke_ts, elapsed)
        self._detect_color_shift(elapsed)
        self._detect_quadrant_focus(elapsed)
        self._detect_check_in(elapsed)

    def _detect_erase_loop(self, elapsed: float) -> None:
        """2-4 erases in a 45-second window, clustered in the same area."""
        window_start = elapsed - 45
        recent = [e for e in self.erase_history if e["timestamp"] > window_start]
        if 2 <= len(recent) <= 4 and len(recent) >= 2:
            xs = [e["x"] for e in recent]
            ys = [e["y"] for e in recent]
            x_range = max(xs) - min(xs)
            y_range = max(ys) - min(ys)
            if x_range < 100 and y_range < 100:
                self.signal_scores["erase_loop"] = (
                    self.signal_scores.get("erase_loop", 0) + SIGNAL_WEIGHTS["erase_loop"]
                )

    def _detect_erase_localized(self) -> None:
        """Multiple erases within 80px radius of each other."""
        if len(self.erase_history) < 2:
            return
        recent = self.erase_history[-5:]
        for i, e1 in enumerate(recent):
            cluster = [
                e2
                for e2 in recent[i + 1 :]
                if math.sqrt((e1["x"] - e2["x"]) ** 2 + (e1["y"] - e2["y"]) ** 2) < 80
            ]
            if len(cluster) >= 2:
                self.signal_scores["erase_localized"] = (
                    self.signal_scores.get("erase_localized", 0)
                    + SIGNAL_WEIGHTS["erase_localized"]
                )
                break

    def _detect_stroke_surge(self, sps: float) -> None:
        """2x or more above the user's rolling stroke baseline."""
        if self.stroke_baseline > 0 and sps >= self.stroke_baseline * 2:
            self.signal_scores["stroke_surge"] = (
                self.signal_scores.get("stroke_surge", 0) + SIGNAL_WEIGHTS["stroke_surge"]
            )

    def _detect_inactivity(self, last_stroke_ts: float, elapsed: float) -> None:
        """8-25 seconds of no strokes. Score boosted if an erase loop preceded it."""
        if last_stroke_ts > 0:
            idle = elapsed - last_stroke_ts
            if 8 <= idle <= 25:
                score = SIGNAL_WEIGHTS["inactivity"]
                if "erase_loop" in self.signal_scores:
                    score *= 1.5
                self.signal_scores["inactivity"] = (
                    self.signal_scores.get("inactivity", 0) + score
                )

    def _detect_color_shift(self, elapsed: float) -> None:
        """2 or more significant hue shifts (delta > 60) in the last 60 seconds."""
        window = [(c, t) for c, t in self.color_history if t > elapsed - 60]
        if len(window) < 2:
            return

        shifts = 0
        prev_color = window[0][0]
        for color, _ in window[1:]:
            delta = self._hsl_delta(prev_color, color)
            if delta > 60:
                shifts += 1
            prev_color = color

        if shifts >= 2:
            self.signal_scores["color_shift"] = (
                self.signal_scores.get("color_shift", 0) + SIGNAL_WEIGHTS["color_shift"]
            )

    def _detect_quadrant_focus(self, elapsed: float) -> None:
        """60-80% average time in a single quadrant over the last 90 seconds."""
        window = [(q, t) for q, t in self.quadrant_history if t > elapsed - 90]
        if len(window) < 5:
            return

        avg: dict[str, float] = {}
        for q_dist, _ in window:
            for k, v in q_dist.items():
                avg[k] = avg.get(k, 0) + v
        for k in avg:
            avg[k] /= len(window)

        max_val = max(avg.values()) if avg else 0
        if 0.60 <= max_val <= 0.80:
            self.signal_scores["quadrant_focus"] = (
                self.signal_scores.get("quadrant_focus", 0) + SIGNAL_WEIGHTS["quadrant_focus"]
            )

    def _detect_check_in(self, elapsed: float) -> None:
        """Periodic timed check-in. Fires when elapsed crosses the randomized target."""
        if elapsed >= self.check_in_target:
            self.signal_scores["check_in"] = (
                self.signal_scores.get("check_in", 0) + SIGNAL_WEIGHTS["check_in"]
            )
            self.check_in_target = elapsed + random.uniform(
                CHECK_IN_MIN_SECONDS,
                CHECK_IN_MAX_SECONDS,
            )

    def _hsl_delta(self, hex1: str, hex2: str) -> float:
        """Compute approximate hue delta between two hex colors in degrees."""
        try:
            import colorsys

            def hex_to_hsl(h: str) -> tuple:
                h = h.lstrip("#")
                if len(h) != 6:
                    return (0, 0, 0)
                r = int(h[0:2], 16) / 255
                g = int(h[2:4], 16) / 255
                b = int(h[4:6], 16) / 255
                return colorsys.rgb_to_hls(r, g, b)

            h1 = hex_to_hsl(hex1)
            h2 = hex_to_hsl(hex2)
            hue_delta = abs(h1[0] - h2[0]) * 360
            return min(hue_delta, 360 - hue_delta)
        except Exception:
            return 0.0
