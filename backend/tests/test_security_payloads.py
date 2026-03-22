import unittest

from input_security import MAX_SAFE_MESSAGE_CHARS, normalize_user_text


class SecurityPayloadTests(unittest.TestCase):
    def test_user_message_truncated_to_safe_max(self) -> None:
        oversized = "x" * (MAX_SAFE_MESSAGE_CHARS + 500)
        normalized = normalize_user_text(oversized)
        self.assertEqual(len(normalized), MAX_SAFE_MESSAGE_CHARS)

    def test_control_chars_removed(self) -> None:
        normalized = normalize_user_text("hello\x00\x01 world")
        self.assertEqual(normalized, "hello world")


if __name__ == "__main__":
    unittest.main()
