import json
import os
import sys
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


if __name__ == "__main__":
    unittest.main()
