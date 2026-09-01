import { expect, test } from "bun:test";

const expectedOperations = [
  ["GET", "/v1/account"], ["GET", "/v1/account/api-usage"],
  ["GET", "/v1/services"], ["GET", "/v1/services/{serviceId}"],
  ["GET", "/v1/domains"], ["GET", "/v1/domains/{domainId}"],
  ["GET", "/v1/domains/{domainId}/dns"], ["POST", "/v1/domains/{domainId}/dns"],
  ["PUT", "/v1/domains/{domainId}/dns/{recordId}"], ["DELETE", "/v1/domains/{domainId}/dns/{recordId}"],
  ["PUT", "/v1/domains/{domainId}/auto-renew"], ["PUT", "/v1/domains/{domainId}/nameservers"],
  ["GET", "/v1/email/services"], ["POST", "/v1/email/services/{serviceId}/provision"], ["POST", "/v1/email/services/{serviceId}/dns/sync"],
  ["GET", "/v1/hosting/services"], ["GET", "/v1/hosting/services/{serviceId}/stats"], ["POST", "/v1/hosting/services/{serviceId}/panel-access"],
  ["GET", "/v1/lxc/instances"], ["GET", "/v1/lxc/instances/{serviceId}"],
  ["GET", "/v1/kvm/instances"], ["GET", "/v1/kvm/instances/{serviceId}"], ["POST", "/v1/kvm/instances/{serviceId}/actions"],
  ["PUT", "/v1/kvm/instances/{serviceId}/auto-renew"], ["GET", "/v1/kvm/instances/{serviceId}/snapshots"],
  ["POST", "/v1/kvm/instances/{serviceId}/snapshots"], ["PATCH", "/v1/kvm/instances/{serviceId}/snapshots/{snapshotId}"],
  ["DELETE", "/v1/kvm/instances/{serviceId}/snapshots/{snapshotId}"],
] as const;

test("keeps the published OpenAPI document aligned with the SDK surface", async () => {
  const document = await Bun.file(new URL("../../../openapi/openapi.json", import.meta.url)).json() as { paths: Record<string, Record<string, unknown>> };
  const actual = Object.entries(document.paths)
    .flatMap(([path, methods]) => Object.keys(methods).filter((method) => ["get", "post", "put", "patch", "delete"].includes(method)).map((method) => [method.toUpperCase(), path] as const))
    .filter(([method, path]) => method !== "OPTIONS" && path.startsWith("/v1/"))
    .sort(([methodA, pathA], [methodB, pathB]) => `${methodA} ${pathA}`.localeCompare(`${methodB} ${pathB}`));
  const expected = [...expectedOperations].sort(([methodA, pathA], [methodB, pathB]) => `${methodA} ${pathA}`.localeCompare(`${methodB} ${pathB}`));
  expect(actual).toEqual(expected);
});
