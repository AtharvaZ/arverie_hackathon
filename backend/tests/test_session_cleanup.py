import unittest

from session_cleanup import get_stale_session_ids


class SessionCleanupTests(unittest.TestCase):
    def test_get_stale_session_ids(self) -> None:
        now_ts = 1000.0
        session_last_seen = {
            "active": 950.0,
            "stale1": 100.0,
            "stale2": 10.0,
        }
        stale = get_stale_session_ids(session_last_seen, now_ts=now_ts, ttl_seconds=300)
        self.assertIn("stale1", stale)
        self.assertIn("stale2", stale)
        self.assertNotIn("active", stale)


if __name__ == "__main__":
    unittest.main()
