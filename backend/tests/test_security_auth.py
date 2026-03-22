import unittest

from security import SecurityError, mint_signed_token, verify_signed_token


class SecurityAuthTests(unittest.TestCase):
    def test_expired_token_rejected(self) -> None:
        token = mint_signed_token({"scope": "session", "session_id": "s1"}, "secret", ttl_seconds=-1)
        with self.assertRaises(SecurityError):
            verify_signed_token(token, "secret", {"session"})

    def test_invalid_signature_rejected(self) -> None:
        token = mint_signed_token({"scope": "session", "session_id": "s1"}, "secret-a", ttl_seconds=60)
        with self.assertRaises(SecurityError):
            verify_signed_token(token, "secret-b", {"session"})


if __name__ == "__main__":
    unittest.main()
