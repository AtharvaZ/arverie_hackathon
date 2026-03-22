import unittest

from rate_limits import SlidingWindowRateLimiter


class RateLimitTests(unittest.TestCase):
    def test_allows_until_limit_then_blocks(self) -> None:
        limiter = SlidingWindowRateLimiter()
        key = "k1"
        for _ in range(3):
            allowed, retry = limiter.check(key, limit=3, window_seconds=60)
            self.assertTrue(allowed)
            self.assertEqual(retry, 0.0)

        allowed, retry = limiter.check(key, limit=3, window_seconds=60)
        self.assertFalse(allowed)
        self.assertGreaterEqual(retry, 0.0)


if __name__ == "__main__":
    unittest.main()
