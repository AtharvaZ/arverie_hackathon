import unittest

from security import SecurityError, mint_signed_token, verify_signed_token


class SecurityWsTests(unittest.TestCase):
    def test_ws_scope_token_valid(self) -> None:
        token = mint_signed_token(
            {"scope": "ws", "session_id": "s1", "user_id": "u1"},
            "secret",
            ttl_seconds=60,
        )
        claims = verify_signed_token(token, "secret", {"ws"})
        self.assertEqual(claims["session_id"], "s1")

    def test_ws_scope_mismatch_rejected(self) -> None:
        token = mint_signed_token({"scope": "session", "session_id": "s1"}, "secret", ttl_seconds=60)
        with self.assertRaises(SecurityError):
            verify_signed_token(token, "secret", {"ws"})


if __name__ == "__main__":
    unittest.main()
