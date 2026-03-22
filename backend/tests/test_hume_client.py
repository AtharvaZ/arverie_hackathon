import json
import os
import sys
import time
import types
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

if "websockets" not in sys.modules:
    sys.modules["websockets"] = types.SimpleNamespace(connect=None)
if "dotenv" not in sys.modules:
    sys.modules["dotenv"] = types.SimpleNamespace(load_dotenv=lambda: None)

from hume_client import HumeClient


class _FakeHumeWS:
    def __init__(self) -> None:
        self.sent: list[str] = []
        self.close_code = None

    async def send(self, message: str) -> None:
        self.sent.append(message)


class _FakeClientWS:
    def __init__(self, messages: list[str]) -> None:
        self._messages = messages

    async def iter_text(self):
        for message in self._messages:
            yield message


class HumeClientProxyTests(unittest.IsolatedAsyncioTestCase):
    async def test_proxy_forwards_only_valid_audio_input_payload(self) -> None:
        client = HumeClient("session-1")
        fake_hume = _FakeHumeWS()
        client.hume_ws = fake_hume
        client.client_ws = _FakeClientWS([
            json.dumps({"type": "audio_input", "data": "abc123"}),
            json.dumps({"type": "audio_input", "data": ""}),
            "not-json",
        ])

        async def _ensure_connected() -> bool:
            return True

        client._ensure_hume_connected = _ensure_connected  # type: ignore[method-assign]
        client._hume_ready_event.set()

        await client._proxy_client_to_hume()

        self.assertEqual(len(fake_hume.sent), 1)
        forwarded = json.loads(fake_hume.sent[0])
        self.assertEqual(forwarded.get("type"), "audio_input")
        self.assertEqual(forwarded.get("data"), "abc123")

    async def test_build_hume_audio_input_rejects_missing_data(self) -> None:
        client = HumeClient("session-2")
        self.assertIsNone(client._build_hume_audio_input({"type": "audio_input"}))
        self.assertIsNone(client._build_hume_audio_input({"type": "audio_input", "data": ""}))
        self.assertEqual(
            client._build_hume_audio_input({"type": "audio_input", "data": "xyz"}),
            {"type": "audio_input", "data": "xyz"},
        )

    async def test_build_hume_audio_input_rejects_oversized_payload(self) -> None:
        client = HumeClient("session-3")
        oversized = "a" * 13000
        self.assertIsNone(
            client._build_hume_audio_input({"type": "audio_input", "data": oversized})
        )

    async def test_inject_trigger_returns_false_when_hume_unavailable(self) -> None:
        client = HumeClient("session-4")

        async def _ensure_connected() -> bool:
            return False

        client._ensure_hume_connected = _ensure_connected  # type: ignore[method-assign]

        delivered = await client.inject_trigger("hello")

        self.assertFalse(delivered)
        self.assertEqual(client.injection_queue, [])

    async def test_inject_trigger_queues_while_waiting_readiness(self) -> None:
        client = HumeClient("session-5")
        client.hume_ws = _FakeHumeWS()

        async def _ensure_connected() -> bool:
            return True

        async def _wait_until_ready(timeout_seconds: float = 4.0) -> bool:
            return False

        client._ensure_hume_connected = _ensure_connected  # type: ignore[method-assign]
        client.wait_until_ready = _wait_until_ready  # type: ignore[method-assign]

        delivered = await client.inject_trigger("hello there")

        self.assertTrue(delivered)
        self.assertEqual(client.injection_queue, ["hello there"])

    async def test_flush_queue_keeps_items_when_not_ready(self) -> None:
        client = HumeClient("session-6")
        client.hume_ws = _FakeHumeWS()
        client.injection_queue = ["queued message"]

        async def _wait_until_ready(timeout_seconds: float = 4.0) -> bool:
            return False

        client.wait_until_ready = _wait_until_ready  # type: ignore[method-assign]

        await client._flush_injection_queue()

        self.assertEqual(client.injection_queue, ["queued message"])

    async def test_assistant_timeout_resets_speaking_flag(self) -> None:
        client = HumeClient("session-7")
        client.assistant_is_speaking = True
        client._last_assistant_event_time = time.time() - 30

        client._check_assistant_speaking_timeout()

        self.assertFalse(client.assistant_is_speaking)
        self.assertEqual(client._last_assistant_event_time, 0.0)

    async def test_inject_trigger_skips_repeated_text(self) -> None:
        client = HumeClient("session-8")
        fake_hume = _FakeHumeWS()
        client.hume_ws = fake_hume
        client._hume_ready_event.set()

        async def _ensure_connected() -> bool:
            return True

        client._ensure_hume_connected = _ensure_connected  # type: ignore[method-assign]

        await client.inject_trigger("you came back to that area again")
        await client.inject_trigger("you came back to that area again")

        self.assertEqual(len(fake_hume.sent), 1)
        forwarded = json.loads(fake_hume.sent[0])
        self.assertEqual(forwarded.get("type"), "assistant_input")
        self.assertEqual(forwarded.get("text"), "you came back to that area again")

    async def test_inject_trigger_queues_while_assistant_speaking(self) -> None:
        client = HumeClient("session-9")
        fake_hume = _FakeHumeWS()
        client.hume_ws = fake_hume
        client.assistant_is_speaking = True

        async def _ensure_connected() -> bool:
            return True

        client._ensure_hume_connected = _ensure_connected  # type: ignore[method-assign]

        await client.inject_trigger("stay with that part")

        self.assertEqual(len(fake_hume.sent), 0)
        self.assertEqual(client.injection_queue, ["stay with that part"])

    async def test_should_send_idle_checkin_when_quiet_long_enough(self) -> None:
        client = HumeClient("session-10")
        client.hume_ws = _FakeHumeWS()
        client._hume_ready_event.set()
        client.user_is_speaking = False
        client.assistant_is_speaking = False
        now = 1000.0
        client._last_audio_input_time = now - 50.0
        client._last_user_message_time = 0.0
        client._last_injection_time = now - 300.0
        client._last_idle_checkin_time = 0.0

        self.assertTrue(client._should_send_idle_checkin(now))

    async def test_should_not_send_idle_checkin_when_recent_user_activity(self) -> None:
        client = HumeClient("session-11")
        client.hume_ws = _FakeHumeWS()
        client._hume_ready_event.set()
        now = 1000.0
        client._last_audio_input_time = now - 5.0
        client._last_injection_time = now - 300.0

        self.assertFalse(client._should_send_idle_checkin(now))


if __name__ == "__main__":
    unittest.main()
