export type ApiEnvelope<T = unknown> = { data: T; request_id: string };
export type RequestOptions = { signal?: AbortSignal };
export type MutationOptions = RequestOptions & { idempotencyKey?: string };
export type KvmAction = "start" | "stop" | "shutdown" | "restart";

export type ClientOptions = {
  apiKey?: string;
  baseUrl?: string;
  fetch?: typeof globalThis.fetch;
};

type ApiErrorBody = { error?: { code?: string; message?: string; request_id?: string } };

export class KmerHostingError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly requestId?: string,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "KmerHostingError";
  }
}

function environmentApiKey(): string | undefined {
  const processValue = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  return processValue?.env?.KMERHOSTING_API_KEY;
}

function trimBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

function encode(value: string): string {
  return encodeURIComponent(value);
}

function newIdempotencyKey(): string {
  if (typeof crypto?.randomUUID === "function") return crypto.randomUUID();
  return `kh_${Date.now()}_${Math.random().toString(36).slice(2, 18)}`;
}

export class KmerHostingClient {
  readonly account = {
    get: (options?: RequestOptions) => this.request("GET", "/v1/account", undefined, options),
    apiUsage: (options?: RequestOptions) => this.request("GET", "/v1/account/api-usage", undefined, options),
  };

  readonly services = {
    list: (options?: RequestOptions) => this.request("GET", "/v1/services", undefined, options),
    get: (serviceId: string, options?: RequestOptions) => this.request("GET", `/v1/services/${encode(serviceId)}`, undefined, options),
  };

  readonly domains = {
    list: (options?: RequestOptions) => this.request("GET", "/v1/domains", undefined, options),
    get: (domainId: string, options?: RequestOptions) => this.request("GET", `/v1/domains/${encode(domainId)}`, undefined, options),
    dns: {
      list: (domainId: string, options?: RequestOptions) => this.request("GET", `/v1/domains/${encode(domainId)}/dns`, undefined, options),
      create: (domainId: string, record: Record<string, unknown>, options?: MutationOptions) => this.mutate("POST", `/v1/domains/${encode(domainId)}/dns`, record, options),
      update: (domainId: string, recordId: string, record: Record<string, unknown>, options?: MutationOptions) => this.mutate("PUT", `/v1/domains/${encode(domainId)}/dns/${encode(recordId)}`, record, options),
      delete: (domainId: string, recordId: string, options?: MutationOptions) => this.mutate("DELETE", `/v1/domains/${encode(domainId)}/dns/${encode(recordId)}`, undefined, options),
    },
    setAutoRenew: (domainId: string, enabled: boolean, options?: MutationOptions) => this.mutate("PUT", `/v1/domains/${encode(domainId)}/auto-renew`, { enabled }, options),
    setNameservers: (domainId: string, nameServers: string[], options?: MutationOptions) => this.mutate("PUT", `/v1/domains/${encode(domainId)}/nameservers`, { nameServers }, options),
  };

  readonly email = {
    listServices: (options?: RequestOptions) => this.request("GET", "/v1/email/services", undefined, options),
    provision: (serviceId: string, options?: MutationOptions) => this.mutate("POST", `/v1/email/services/${encode(serviceId)}/provision`, {}, options),
    syncDns: (serviceId: string, options?: MutationOptions) => this.mutate("POST", `/v1/email/services/${encode(serviceId)}/dns/sync`, {}, options),
  };

  readonly hosting = {
    listServices: (options?: RequestOptions) => this.request("GET", "/v1/hosting/services", undefined, options),
    stats: (serviceId: string, options?: RequestOptions) => this.request("GET", `/v1/hosting/services/${encode(serviceId)}/stats`, undefined, options),
    createPanelAccess: (serviceId: string, target: "panel" | "filemanager" = "panel", options?: MutationOptions) => this.mutate("POST", `/v1/hosting/services/${encode(serviceId)}/panel-access`, { target }, options),
  };

  readonly lxc = {
    list: (options?: RequestOptions) => this.request("GET", "/v1/lxc/instances", undefined, options),
    get: (serviceId: string, options?: RequestOptions) => this.request("GET", `/v1/lxc/instances/${encode(serviceId)}`, undefined, options),
  };

  readonly kvm = {
    list: (options?: RequestOptions) => this.request("GET", "/v1/kvm/instances", undefined, options),
    get: (serviceId: string, options?: RequestOptions) => this.request("GET", `/v1/kvm/instances/${encode(serviceId)}`, undefined, options),
    action: (serviceId: string, action: KvmAction, options?: MutationOptions) => this.mutate("POST", `/v1/kvm/instances/${encode(serviceId)}/actions`, { action }, options),
    setAutoRenew: (serviceId: string, enabled: boolean, options?: MutationOptions) => this.mutate("PUT", `/v1/kvm/instances/${encode(serviceId)}/auto-renew`, { enabled }, options),
    snapshots: {
      list: (serviceId: string, options?: RequestOptions) => this.request("GET", `/v1/kvm/instances/${encode(serviceId)}/snapshots`, undefined, options),
      create: (serviceId: string, snapshot: { name: string; description?: string }, options?: MutationOptions) => this.mutate("POST", `/v1/kvm/instances/${encode(serviceId)}/snapshots`, snapshot, options),
      update: (serviceId: string, snapshotId: string, snapshot: { name?: string; description?: string }, options?: MutationOptions) => this.mutate("PATCH", `/v1/kvm/instances/${encode(serviceId)}/snapshots/${encode(snapshotId)}`, snapshot, options),
      delete: (serviceId: string, snapshotId: string, options?: MutationOptions) => this.mutate("DELETE", `/v1/kvm/instances/${encode(serviceId)}/snapshots/${encode(snapshotId)}`, undefined, options),
    },
  };

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof globalThis.fetch;

  constructor(options: ClientOptions = {}) {
    this.apiKey = options.apiKey ?? environmentApiKey() ?? "";
    if (!this.apiKey) throw new Error("Set KMERHOSTING_API_KEY or pass apiKey to KmerHostingClient.");
    this.baseUrl = trimBaseUrl(options.baseUrl ?? "https://api.kmerhosting.com");
    this.fetchImpl = options.fetch ?? globalThis.fetch;
    if (!this.fetchImpl) throw new Error("A Fetch implementation is required.");
  }

  private async mutate(method: "POST" | "PUT" | "PATCH" | "DELETE", path: string, body: unknown, options: MutationOptions = {}): Promise<ApiEnvelope> {
    return this.request(method, path, body, options, options.idempotencyKey ?? newIdempotencyKey());
  }

  private async request<T = unknown>(method: string, path: string, body?: unknown, options: RequestOptions = {}, idempotencyKey?: string): Promise<ApiEnvelope<T>> {
    const headers = new Headers({
      Accept: "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    });
    if (body !== undefined) headers.set("Content-Type", "application/json");
    if (idempotencyKey) headers.set("Idempotency-Key", idempotencyKey);

    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: options.signal,
    });
    const text = await response.text();
    let payload: unknown = undefined;
    if (text) {
      try { payload = JSON.parse(text); } catch { payload = text; }
    }
    if (!response.ok) {
      const error = payload as ApiErrorBody;
      throw new KmerHostingError(
        error?.error?.message ?? `KmerHosting API request failed with status ${response.status}.`,
        response.status,
        error?.error?.code ?? "request_failed",
        error?.error?.request_id ?? response.headers.get("X-Request-Id") ?? undefined,
        payload,
      );
    }
    return payload as ApiEnvelope<T>;
  }
}
