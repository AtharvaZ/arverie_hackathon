import os
import sys
import time
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from canvas_processor import CanvasEventProcessor


class CanvasEventProcessorTests(unittest.TestCase):
    def _snapshot(self, *, elapsed: float, colors: list[str] | None = None) -> dict:
        return {
            "strokes_per_second": 0.0,
            "current_color": (colors or ["#000000"])[-1],
            "colors_used_this_window": colors or [],
            "erase_events": [],
            "quadrant_distribution": {
                "top_left": 0.25,
                "top_right": 0.25,
                "bottom_left": 0.25,
                "bottom_right": 0.25,
            },
            "last_stroke_timestamp": 0.0,
            "elapsed_seconds": elapsed,
        }

    def test_check_in_due_persists_through_cooldown(self) -> None:
        processor = CanvasEventProcessor()
        processor.check_in_target = 5.0
        processor.last_trigger_time = time.time()

        processor.update(self._snapshot(elapsed=6.0))

        self.assertTrue(processor.check_in_due)
        self.assertEqual(processor.check_in_target, 5.0)
        self.assertFalse(processor.should_trigger().should_fire)

        processor.last_trigger_time = 0.0
        trigger = processor.should_trigger()
        self.assertTrue(trigger.should_fire)
        self.assertEqual(trigger.dominant_signal, "check_in")

    def test_non_check_trigger_reset_keeps_due_target(self) -> None:
        processor = CanvasEventProcessor()
        processor.check_in_target = 42.0
        processor._last_elapsed = 120.0

        processor.reset_after_trigger("erase_loop")

        self.assertEqual(processor.check_in_target, 42.0)

    def test_color_shift_uses_window_color_sequence(self) -> None:
        processor = CanvasEventProcessor()

        processor.update(
            self._snapshot(
                elapsed=100.0,
                colors=["#ff0000", "#00ff00", "#0000ff"],
            )
        )

        self.assertGreater(processor.signal_scores.get("color_shift", 0.0), 0.0)


if __name__ == "__main__":
    unittest.main()
