import time
import unittest

from rate_limits import SlidingWindowRateLimiter


class SecurityLimitsTests(unittest.TestCase):
    def test_burst_limit_blocks_then_recovers(self) -> None:
        limiter = SlidingWindowRateLimiter()
        key = "msg:user-1"
        self.assertTrue(limiter.check(key, limit=2, window_seconds=0.05)[0])
        self.assertTrue(limiter.check(key, limit=2, window_seconds=0.05)[0])
        self.assertFalse(limiter.check(key, limit=2, window_seconds=0.05)[0])
        time.sleep(0.06)
        self.assertTrue(limiter.check(key, limit=2, window_seconds=0.05)[0])


if __name__ == "__main__":
    unittest.main()
