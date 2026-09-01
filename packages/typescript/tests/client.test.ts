import { expect, test } from "bun:test";
import { KmerHostingClient, KmerHostingError } from "../src/index";

const id = "22222222-2222-4222-8222-222222222222";
const recordId = "33333333-3333-4333-8333-333333333333";

type Call = {
  name: string;
  method: string;
  path: string;
  invoke: (client: KmerHostingClient) => Promise<unknown>;
  body?: unknown;
};

test("maps every public TypeScript SDK operation to the API contract", async () => {
  const requests: Request[] = [];
  const client = new KmerHostingClient({
    apiKey: "kh_live_test",
    baseUrl: "https://example.test/",
    fetch: async (input, init) => {
      requests.push(new Request(input, init));
      const method = init?.method ?? "GET";
      return Response.json({ data: { ok: true }, request_id: "test" }, { status: method === "GET" ? 200 : 202 });
    },
  });

  const calls: Call[] = [
    { name: "account.get", method: "GET", path: "/v1/account", invoke: (c) => c.account.get() },
    { name: "account.apiUsage", method: "GET", path: "/v1/account/api-usage", invoke: (c) => c.account.apiUsage() },
    { name: "services.list", method: "GET", path: "/v1/services", invoke: (c) => c.services.list() },
    { name: "services.get", method: "GET", path: `/v1/services/${id}`, invoke: (c) => c.services.get(id) },
    { name: "domains.list", method: "GET", path: "/v1/domains", invoke: (c) => c.domains.list() },
    { name: "domains.get", method: "GET", path: `/v1/domains/${id}`, invoke: (c) => c.domains.get(id) },
    { name: "domains.dns.list", method: "GET", path: `/v1/domains/${id}/dns`, invoke: (c) => c.domains.dns.list(id) },
    { name: "domains.dns.create", method: "POST", path: `/v1/domains/${id}/dns`, body: { type: "A" }, invoke: (c) => c.domains.dns.create(id, { type: "A" }, { idempotencyKey: "dns-create-1" }) },
    { name: "domains.dns.update", method: "PUT", path: `/v1/domains/${id}/dns/${recordId}`, body: { content: "192.0.2.1" }, invoke: (c) => c.domains.dns.update(id, recordId, { content: "192.0.2.1" }, { idempotencyKey: "dns-update-1" }) },
    { name: "domains.dns.delete", method: "DELETE", path: `/v1/domains/${id}/dns/${recordId}`, invoke: (c) => c.domains.dns.delete(id, recordId, { idempotencyKey: "dns-delete-1" }) },
    { name: "domains.setAutoRenew", method: "PUT", path: `/v1/domains/${id}/auto-renew`, body: { enabled: true }, invoke: (c) => c.domains.setAutoRenew(id, true, { idempotencyKey: "domain-renew-1" }) },
    { name: "domains.setNameservers", method: "PUT", path: `/v1/domains/${id}/nameservers`, body: { nameServers: ["ns1.example.test", "ns2.example.test"] }, invoke: (c) => c.domains.setNameservers(id, ["ns1.example.test", "ns2.example.test"], { idempotencyKey: "domain-ns-1" }) },
    { name: "email.listServices", method: "GET", path: "/v1/email/services", invoke: (c) => c.email.listServices() },
    { name: "email.provision", method: "POST", path: `/v1/email/services/${id}/provision`, body: {}, invoke: (c) => c.email.provision(id, { idempotencyKey: "email-provision-1" }) },
    { name: "email.syncDns", method: "POST", path: `/v1/email/services/${id}/dns/sync`, body: {}, invoke: (c) => c.email.syncDns(id, { idempotencyKey: "email-sync-1" }) },
    { name: "hosting.listServices", method: "GET", path: "/v1/hosting/services", invoke: (c) => c.hosting.listServices() },
    { name: "hosting.stats", method: "GET", path: `/v1/hosting/services/${id}/stats`, invoke: (c) => c.hosting.stats(id) },
    { name: "hosting.createPanelAccess", method: "POST", path: `/v1/hosting/services/${id}/panel-access`, body: { target: "filemanager" }, invoke: (c) => c.hosting.createPanelAccess(id, "filemanager", { idempotencyKey: "hosting-panel-1" }) },
    { name: "lxc.list", method: "GET", path: "/v1/lxc/instances", invoke: (c) => c.lxc.list() },
    { name: "lxc.get", method: "GET", path: `/v1/lxc/instances/${id}`, invoke: (c) => c.lxc.get(id) },
    { name: "lxc.metrics", method: "GET", path: `/v1/lxc/instances/${id}/metrics`, invoke: (c) => c.lxc.metrics(id) },
    { name: "lxc.action", method: "POST", path: `/v1/lxc/instances/${id}/actions`, body: { action: "restart" }, invoke: (c) => c.lxc.action(id, "restart", { idempotencyKey: "lxc-action-1" }) },
    { name: "lxc.snapshots.list", method: "GET", path: `/v1/lxc/instances/${id}/snapshots`, invoke: (c) => c.lxc.snapshots.list(id) },
    { name: "lxc.snapshots.mutate", method: "POST", path: `/v1/lxc/instances/${id}/snapshots`, body: { action: "create", name: "before-upgrade" }, invoke: (c) => c.lxc.snapshots.mutate(id, "create", "before-upgrade", { idempotencyKey: "lxc-snapshot-1" }) },
    { name: "kvm.list", method: "GET", path: "/v1/kvm/instances", invoke: (c) => c.kvm.list() },
    { name: "kvm.get", method: "GET", path: `/v1/kvm/instances/${id}`, invoke: (c) => c.kvm.get(id) },
    { name: "kvm.action", method: "POST", path: `/v1/kvm/instances/${id}/actions`, body: { action: "restart" }, invoke: (c) => c.kvm.action(id, "restart", { idempotencyKey: "kvm-action-1" }) },
    { name: "kvm.setAutoRenew", method: "PUT", path: `/v1/kvm/instances/${id}/auto-renew`, body: { enabled: true }, invoke: (c) => c.kvm.setAutoRenew(id, true, { idempotencyKey: "kvm-renew-1" }) },
    { name: "kvm.snapshots.list", method: "GET", path: `/v1/kvm/instances/${id}/snapshots`, invoke: (c) => c.kvm.snapshots.list(id) },
    { name: "kvm.snapshots.create", method: "POST", path: `/v1/kvm/instances/${id}/snapshots`, body: { name: "test", description: "snapshot" }, invoke: (c) => c.kvm.snapshots.create(id, { name: "test", description: "snapshot" }, { idempotencyKey: "snapshot-create-1" }) },
    { name: "kvm.snapshots.update", method: "PATCH", path: `/v1/kvm/instances/${id}/snapshots/${recordId}`, body: { name: "renamed" }, invoke: (c) => c.kvm.snapshots.update(id, recordId, { name: "renamed" }, { idempotencyKey: "snapshot-update-1" }) },
    { name: "kvm.snapshots.delete", method: "DELETE", path: `/v1/kvm/instances/${id}/snapshots/${recordId}`, invoke: (c) => c.kvm.snapshots.delete(id, recordId, { idempotencyKey: "snapshot-delete-1" }) },
  ];

  for (const call of calls) {
    await call.invoke(client);
    const request = requests.at(-1)!;
    expect(request.method, call.name).toBe(call.method);
    expect(new URL(request.url).pathname, call.name).toBe(call.path);
    expect(request.headers.get("Authorization"), call.name).toBe("Bearer kh_live_test");
    if (call.method === "GET") {
      expect(request.headers.get("Idempotency-Key"), call.name).toBeNull();
    } else {
      expect(request.headers.get("Idempotency-Key"), call.name).toBeTruthy();
      if (call.body !== undefined) expect(await request.json(), call.name).toEqual(call.body);
    }
  }
  expect(calls).toHaveLength(32);
});

test("preserves structured API errors for SDK callers", async () => {
  const client = new KmerHostingClient({
    apiKey: "kh_live_test",
    baseUrl: "https://example.test",
    fetch: async () => Response.json({ error: { code: "insufficient_scope", message: "The scope is missing.", request_id: "request-1" } }, { status: 403 }),
  });

  try {
    await client.account.get();
    throw new Error("expected KmerHostingError");
  } catch (error) {
    expect(error).toBeInstanceOf(KmerHostingError);
    expect(error).toMatchObject({ status: 403, code: "insufficient_scope", message: "The scope is missing.", requestId: "request-1" });
  }
});

test("generates idempotency keys when callers omit them", async () => {
  let request: Request | undefined;
  const client = new KmerHostingClient({
    apiKey: "kh_live_test",
    baseUrl: "https://example.test",
    fetch: async (input, init) => {
      request = new Request(input, init);
      return Response.json({ data: {}, request_id: "test" }, { status: 202 });
    },
  });
  await client.kvm.action(id, "restart");
  expect(request?.headers.get("Idempotency-Key")).toMatch(/^[0-9a-f-]{36}$/);
});

test("normalizes non-JSON API failures into KmerHostingError", async () => {
  const client = new KmerHostingClient({
    apiKey: "kh_live_test",
    baseUrl: "https://example.test",
    fetch: async () => new Response("upstream unavailable", { status: 502 }),
  });
  try {
    await client.account.get();
    throw new Error("expected KmerHostingError");
  } catch (error) {
    expect(error).toBeInstanceOf(KmerHostingError);
    expect(error).toMatchObject({ status: 502, code: "request_failed" });
  }
});
