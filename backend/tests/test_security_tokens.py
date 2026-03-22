import os
import base64
import unittest

from security import SecurityError, mint_signed_token, parse_bearer_token, verify_signed_token


class SecurityTokenTests(unittest.TestCase):
    @staticmethod
    def _tamper_signature(token: str) -> str:
        body, sig = token.rsplit(".", 1)
        padding = "=" * (-len(sig) % 4)
        raw = bytearray(base64.urlsafe_b64decode(sig + padding))
        raw[0] ^= 0x01
        tampered_sig = base64.urlsafe_b64encode(bytes(raw)).decode("utf-8").rstrip("=")
        return f"{body}.{tampered_sig}"

    def test_parse_bearer_token(self) -> None:
        self.assertEqual(parse_bearer_token("Bearer abc.def"), "abc.def")
        self.assertIsNone(parse_bearer_token("Token abc"))
        self.assertIsNone(parse_bearer_token(None))

    def test_mint_and_verify_token(self) -> None:
        secret = "unit-test-secret"
        token = mint_signed_token(
            {"scope": "session", "session_id": "s1", "user_id": "u1"},
            secret,
            ttl_seconds=60,
        )
        claims = verify_signed_token(token, secret, {"session"})
        self.assertEqual(claims["session_id"], "s1")
        self.assertEqual(claims["user_id"], "u1")

    def test_verify_rejects_scope(self) -> None:
        secret = "unit-test-secret"
        token = mint_signed_token({"scope": "session"}, secret, ttl_seconds=60)
        with self.assertRaises(SecurityError):
            verify_signed_token(token, secret, {"user"})

    def test_verify_rejects_invalid_signature(self) -> None:
        secret = "unit-test-secret"
        token = mint_signed_token({"scope": "session"}, secret, ttl_seconds=60)
        tampered = self._tamper_signature(token)
        with self.assertRaises(SecurityError):
            verify_signed_token(tampered, secret, {"session"})


class EnvValidationSmokeTests(unittest.TestCase):
    def test_required_secret_present_in_env_example_schema(self) -> None:
        # Guard against regressions where the documented env schema omits session secret.
        env_example_path = os.path.join(
            os.path.dirname(__file__), "..", ".env.example"
        )
        with open(env_example_path, "r", encoding="utf-8") as handle:
            content = handle.read()
        self.assertIn("SESSION_TOKEN_SECRET=", content)


if __name__ == "__main__":
    unittest.main()
