import json
import unittest
from unittest.mock import patch
from urllib.error import HTTPError

from kmerhosting import KmerHostingClient, KmerHostingError


ID = "22222222-2222-4222-8222-222222222222"
RECORD_ID = "33333333-3333-4333-8333-333333333333"


class FakeResponse:
    def __init__(self, payload=None):
        self.headers = {}
        self.payload = payload or {"data": {"ok": True}, "request_id": "test"}

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def read(self) -> bytes:
        return json.dumps(self.payload).encode()


class ClientTests(unittest.TestCase):
    @patch("kmerhosting.client.urllib.request.urlopen")
    def test_all_public_operations_match_api_contract(self, urlopen):
        urlopen.return_value = FakeResponse()
        client = KmerHostingClient(api_key="kh_live_test", base_url="https://example.test/")
        calls = [
            ("account.get", "GET", "/v1/account", lambda: client.account.get(), None),
            ("services.list", "GET", "/v1/services", lambda: client.services.list(), None),
            ("services.get", "GET", f"/v1/services/{ID}", lambda: client.services.get(ID), None),
            ("domains.list", "GET", "/v1/domains", lambda: client.domains.list(), None),
            ("domains.get", "GET", f"/v1/domains/{ID}", lambda: client.domains.get(ID), None),
            ("domains.dns.list", "GET", f"/v1/domains/{ID}/dns", lambda: client.domains.dns.list(ID), None),
            ("domains.dns.create", "POST", f"/v1/domains/{ID}/dns", lambda: client.domains.dns.create(ID, {"type": "A"}, "dns-create-1"), {"type": "A"}),
            ("domains.dns.update", "PUT", f"/v1/domains/{ID}/dns/{RECORD_ID}", lambda: client.domains.dns.update(ID, RECORD_ID, {"content": "192.0.2.1"}, "dns-update-1"), {"content": "192.0.2.1"}),
            ("domains.dns.delete", "DELETE", f"/v1/domains/{ID}/dns/{RECORD_ID}", lambda: client.domains.dns.delete(ID, RECORD_ID, "dns-delete-1"), None),
            ("domains.set_auto_renew", "PUT", f"/v1/domains/{ID}/auto-renew", lambda: client.domains.set_auto_renew(ID, True, "domain-renew-1"), {"enabled": True}),
            ("domains.set_nameservers", "PUT", f"/v1/domains/{ID}/nameservers", lambda: client.domains.set_nameservers(ID, ["ns1.example.test", "ns2.example.test"], "domain-ns-1"), {"nameServers": ["ns1.example.test", "ns2.example.test"]}),
            ("email.list_services", "GET", "/v1/email/services", lambda: client.email.list_services(), None),
            ("email.provision", "POST", f"/v1/email/services/{ID}/provision", lambda: client.email.provision(ID, "email-provision-1"), {}),
            ("email.sync_dns", "POST", f"/v1/email/services/{ID}/dns/sync", lambda: client.email.sync_dns(ID, "email-sync-1"), {}),
            ("hosting.list_services", "GET", "/v1/hosting/services", lambda: client.hosting.list_services(), None),
            ("hosting.stats", "GET", f"/v1/hosting/services/{ID}/stats", lambda: client.hosting.stats(ID), None),
            ("hosting.create_panel_access", "POST", f"/v1/hosting/services/{ID}/panel-access", lambda: client.hosting.create_panel_access(ID, "filemanager", "hosting-panel-1"), {"target": "filemanager"}),
            ("lxc.list", "GET", "/v1/lxc/instances", lambda: client.lxc.list(), None),
            ("lxc.get", "GET", f"/v1/lxc/instances/{ID}", lambda: client.lxc.get(ID), None),
            ("kvm.list", "GET", "/v1/kvm/instances", lambda: client.kvm.list(), None),
            ("kvm.get", "GET", f"/v1/kvm/instances/{ID}", lambda: client.kvm.get(ID), None),
            ("kvm.action", "POST", f"/v1/kvm/instances/{ID}/actions", lambda: client.kvm.action(ID, "restart", "kvm-action-1"), {"action": "restart"}),
            ("kvm.set_auto_renew", "PUT", f"/v1/kvm/instances/{ID}/auto-renew", lambda: client.kvm.set_auto_renew(ID, True, "kvm-renew-1"), {"enabled": True}),
            ("kvm.snapshots.list", "GET", f"/v1/kvm/instances/{ID}/snapshots", lambda: client.kvm.snapshots.list(ID), None),
            ("kvm.snapshots.create", "POST", f"/v1/kvm/instances/{ID}/snapshots", lambda: client.kvm.snapshots.create(ID, "test", "snapshot", "snapshot-create-1"), {"name": "test", "description": "snapshot"}),
            ("kvm.snapshots.update", "PATCH", f"/v1/kvm/instances/{ID}/snapshots/{RECORD_ID}", lambda: client.kvm.snapshots.update(ID, RECORD_ID, "renamed", None, "snapshot-update-1"), {"name": "renamed"}),
            ("kvm.snapshots.delete", "DELETE", f"/v1/kvm/instances/{ID}/snapshots/{RECORD_ID}", lambda: client.kvm.snapshots.delete(ID, RECORD_ID, "snapshot-delete-1"), None),
        ]

        for name, method, path, invoke, expected_body in calls:
            with self.subTest(name=name):
                invoke()
                request = urlopen.call_args.args[0]
                self.assertEqual(request.get_method(), method)
                self.assertEqual(request.full_url, f"https://example.test{path}")
                self.assertEqual(request.get_header("Authorization"), "Bearer kh_live_test")
                if method == "GET":
                    self.assertIsNone(request.get_header("Idempotency-key"))
                else:
                    self.assertTrue(request.get_header("Idempotency-key"))
                    if expected_body is not None:
                        self.assertEqual(json.loads(request.data.decode()), expected_body)

        self.assertEqual(urlopen.call_count, 27)

    @patch("kmerhosting.client.urllib.request.urlopen")
    def test_preserves_structured_api_errors(self, urlopen):
        error_body = {"error": {"code": "insufficient_scope", "message": "The scope is missing.", "request_id": "request-1"}}
        error = HTTPError("https://example.test/v1/account", 403, "Forbidden", {"X-Request-Id": "header-request"}, None)
        error.read = lambda: json.dumps(error_body).encode()
        urlopen.side_effect = error
        client = KmerHostingClient(api_key="kh_live_test", base_url="https://example.test")

        with self.assertRaises(KmerHostingError) as raised:
            client.account.get()
        self.assertEqual(raised.exception.status, 403)
        self.assertEqual(raised.exception.code, "insufficient_scope")
        self.assertEqual(raised.exception.request_id, "request-1")
        self.assertEqual(str(raised.exception), "The scope is missing.")

    @patch("kmerhosting.client.urllib.request.urlopen")
    def test_generates_idempotency_key_when_omitted(self, urlopen):
        urlopen.return_value = FakeResponse()
        client = KmerHostingClient(api_key="kh_live_test", base_url="https://example.test")
        client.kvm.action(ID, "restart")
        self.assertRegex(urlopen.call_args.args[0].get_header("Idempotency-key"), r"^[0-9a-f-]{36}$")

    @patch("kmerhosting.client.urllib.request.urlopen")
    def test_normalizes_non_json_api_failures(self, urlopen):
        error = HTTPError("https://example.test/v1/account", 502, "Bad Gateway", {}, None)
        error.read = lambda: b"upstream unavailable"
        urlopen.side_effect = error
        client = KmerHostingClient(api_key="kh_live_test", base_url="https://example.test")

        with self.assertRaises(KmerHostingError) as raised:
            client.account.get()
        self.assertEqual(raised.exception.status, 502)
        self.assertEqual(raised.exception.code, "request_failed")


if __name__ == "__main__":
    unittest.main()
