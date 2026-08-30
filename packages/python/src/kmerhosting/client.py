"""Official synchronous KmerHosting API client."""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.parse
import urllib.request
import uuid
from typing import Any, Mapping, Optional


Json = Mapping[str, Any]


class KmerHostingError(RuntimeError):
    """A non-successful response from the KmerHosting API."""

    def __init__(self, message: str, status: int, code: str, request_id: Optional[str] = None, body: Any = None) -> None:
        super().__init__(message)
        self.status = status
        self.code = code
        self.request_id = request_id
        self.body = body


def _encode(value: str) -> str:
    return urllib.parse.quote(value, safe="")


class _Resource:
    def __init__(self, client: "KmerHostingClient") -> None:
        self._client = client


class _AccountResource(_Resource):
    def get(self) -> Json:
        return self._client._request("GET", "/v1/account")


class _ServicesResource(_Resource):
    def list(self) -> Json:
        return self._client._request("GET", "/v1/services")

    def get(self, service_id: str) -> Json:
        return self._client._request("GET", f"/v1/services/{_encode(service_id)}")


class _DnsResource(_Resource):
    def list(self, domain_id: str) -> Json:
        return self._client._request("GET", f"/v1/domains/{_encode(domain_id)}/dns")

    def create(self, domain_id: str, record: Json, idempotency_key: Optional[str] = None) -> Json:
        return self._client._mutate("POST", f"/v1/domains/{_encode(domain_id)}/dns", record, idempotency_key)

    def update(self, domain_id: str, record_id: str, record: Json, idempotency_key: Optional[str] = None) -> Json:
        return self._client._mutate("PUT", f"/v1/domains/{_encode(domain_id)}/dns/{_encode(record_id)}", record, idempotency_key)

    def delete(self, domain_id: str, record_id: str, idempotency_key: Optional[str] = None) -> Json:
        return self._client._mutate("DELETE", f"/v1/domains/{_encode(domain_id)}/dns/{_encode(record_id)}", None, idempotency_key)


class _DomainsResource(_Resource):
    def __init__(self, client: "KmerHostingClient") -> None:
        super().__init__(client)
        self.dns = _DnsResource(client)

    def list(self) -> Json:
        return self._client._request("GET", "/v1/domains")

    def get(self, domain_id: str) -> Json:
        return self._client._request("GET", f"/v1/domains/{_encode(domain_id)}")

    def set_auto_renew(self, domain_id: str, enabled: bool, idempotency_key: Optional[str] = None) -> Json:
        return self._client._mutate("PUT", f"/v1/domains/{_encode(domain_id)}/auto-renew", {"enabled": enabled}, idempotency_key)

    def set_nameservers(self, domain_id: str, name_servers: list[str], idempotency_key: Optional[str] = None) -> Json:
        return self._client._mutate("PUT", f"/v1/domains/{_encode(domain_id)}/nameservers", {"nameServers": name_servers}, idempotency_key)


class _EmailResource(_Resource):
    def list_services(self) -> Json:
        return self._client._request("GET", "/v1/email/services")

    def provision(self, service_id: str, idempotency_key: Optional[str] = None) -> Json:
        return self._client._mutate("POST", f"/v1/email/services/{_encode(service_id)}/provision", {}, idempotency_key)

    def sync_dns(self, service_id: str, idempotency_key: Optional[str] = None) -> Json:
        return self._client._mutate("POST", f"/v1/email/services/{_encode(service_id)}/dns/sync", {}, idempotency_key)


class _HostingResource(_Resource):
    def list_services(self) -> Json:
        return self._client._request("GET", "/v1/hosting/services")

    def stats(self, service_id: str) -> Json:
        return self._client._request("GET", f"/v1/hosting/services/{_encode(service_id)}/stats")

    def create_panel_access(self, service_id: str, target: str = "panel", idempotency_key: Optional[str] = None) -> Json:
        return self._client._mutate("POST", f"/v1/hosting/services/{_encode(service_id)}/panel-access", {"target": target}, idempotency_key)


class _SnapshotsResource(_Resource):
    def list(self, service_id: str) -> Json:
        return self._client._request("GET", f"/v1/vps/instances/{_encode(service_id)}/snapshots")

    def create(self, service_id: str, name: str, description: Optional[str] = None, idempotency_key: Optional[str] = None) -> Json:
        body: dict[str, Any] = {"name": name}
        if description is not None:
            body["description"] = description
        return self._client._mutate("POST", f"/v1/vps/instances/{_encode(service_id)}/snapshots", body, idempotency_key)

    def update(self, service_id: str, snapshot_id: str, name: Optional[str] = None, description: Optional[str] = None, idempotency_key: Optional[str] = None) -> Json:
        body: dict[str, Any] = {}
        if name is not None:
            body["name"] = name
        if description is not None:
            body["description"] = description
        return self._client._mutate("PATCH", f"/v1/vps/instances/{_encode(service_id)}/snapshots/{_encode(snapshot_id)}", body, idempotency_key)

    def delete(self, service_id: str, snapshot_id: str, idempotency_key: Optional[str] = None) -> Json:
        return self._client._mutate("DELETE", f"/v1/vps/instances/{_encode(service_id)}/snapshots/{_encode(snapshot_id)}", None, idempotency_key)


class _VpsResource(_Resource):
    def __init__(self, client: "KmerHostingClient") -> None:
        super().__init__(client)
        self.snapshots = _SnapshotsResource(client)

    def list(self) -> Json:
        return self._client._request("GET", "/v1/vps/instances")

    def get(self, service_id: str) -> Json:
        return self._client._request("GET", f"/v1/vps/instances/{_encode(service_id)}")

    def action(self, service_id: str, action: str, idempotency_key: Optional[str] = None) -> Json:
        return self._client._mutate("POST", f"/v1/vps/instances/{_encode(service_id)}/actions", {"action": action}, idempotency_key)

    def set_auto_renew(self, service_id: str, enabled: bool, idempotency_key: Optional[str] = None) -> Json:
        return self._client._mutate("PUT", f"/v1/vps/instances/{_encode(service_id)}/auto-renew", {"enabled": enabled}, idempotency_key)


class KmerHostingClient:
    """A synchronous client. It never stores or logs API credentials."""

    def __init__(self, api_key: Optional[str] = None, base_url: str = "https://api.kmerhosting.com", timeout: float = 30.0) -> None:
        self.api_key = api_key or os.environ.get("KMERHOSTING_API_KEY")
        if not self.api_key:
            raise ValueError("Set KMERHOSTING_API_KEY or pass api_key to KmerHostingClient.")
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.account = _AccountResource(self)
        self.services = _ServicesResource(self)
        self.domains = _DomainsResource(self)
        self.email = _EmailResource(self)
        self.hosting = _HostingResource(self)
        self.vps = _VpsResource(self)

    def _mutate(self, method: str, path: str, body: Optional[Mapping[str, Any]], idempotency_key: Optional[str]) -> Json:
        return self._request(method, path, body, idempotency_key or str(uuid.uuid4()))

    def _request(self, method: str, path: str, body: Optional[Mapping[str, Any]] = None, idempotency_key: Optional[str] = None) -> Json:
        headers = {"Accept": "application/json", "Authorization": f"Bearer {self.api_key}"}
        data = None
        if body is not None:
            headers["Content-Type"] = "application/json"
            data = json.dumps(body).encode("utf-8")
        if idempotency_key:
            headers["Idempotency-Key"] = idempotency_key
        request = urllib.request.Request(f"{self.base_url}{path}", data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(request, timeout=self.timeout) as response:
                return self._decode(response.read())
        except urllib.error.HTTPError as error:
            payload = self._decode(error.read())
            details = payload.get("error", {}) if isinstance(payload, Mapping) else {}
            raise KmerHostingError(
                str(details.get("message") or f"KmerHosting API request failed with status {error.code}."),
                error.code,
                str(details.get("code") or "request_failed"),
                details.get("request_id") or error.headers.get("X-Request-Id"),
                payload,
            ) from error
        except urllib.error.URLError as error:
            raise KmerHostingError("Unable to reach the KmerHosting API.", 0, "connection_failed") from error

    @staticmethod
    def _decode(raw: bytes) -> Json:
        if not raw:
            return {}
        parsed = json.loads(raw.decode("utf-8"))
        return parsed if isinstance(parsed, Mapping) else {"data": parsed}
