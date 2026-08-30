import json
import unittest
from unittest.mock import patch

from kmerhosting import KmerHostingClient


class FakeResponse:
    def __init__(self) -> None:
        self.headers = {}

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def read(self) -> bytes:
        return json.dumps({"data": {"queued": True}, "request_id": "test"}).encode()


class ClientTests(unittest.TestCase):
    @patch("kmerhosting.client.urllib.request.urlopen")
    def test_mutation_sends_authentication_and_idempotency(self, urlopen) -> None:
        urlopen.return_value = FakeResponse()
        client = KmerHostingClient(api_key="kh_live_test", base_url="https://example.test")

        result = client.vps.action("instance-1", "restart")

        self.assertEqual(result["data"], {"queued": True})
        request = urlopen.call_args.args[0]
        self.assertEqual(request.get_header("Authorization"), "Bearer kh_live_test")
        self.assertTrue(request.get_header("Idempotency-key"))


if __name__ == "__main__":
    unittest.main()
