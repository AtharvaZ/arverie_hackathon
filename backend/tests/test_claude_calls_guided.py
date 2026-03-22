import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from claude_calls import _enforce_trigger_shape


class ClaudeCallsGuidedModeTests(unittest.TestCase):
    def test_guided_mode_removes_question_marks(self) -> None:
        text = "Would you like to try one more line here?"
        shaped = _enforce_trigger_shape("check_in", text, guided_mode=True)
        self.assertNotIn("?", shaped)

    def test_guided_mode_check_in_has_directional_fallback(self) -> None:
        shaped = _enforce_trigger_shape("check_in", "?", guided_mode=True)
        self.assertIn("add one small mark", shaped)
        self.assertNotIn("?", shaped)


if __name__ == "__main__":
    unittest.main()
