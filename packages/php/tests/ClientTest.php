<?php

declare(strict_types=1);

require_once __DIR__ . '/../src/ApiException.php';
require_once __DIR__ . '/../src/Client.php';

use KmerHosting\ApiException;
use KmerHosting\Client;

$id = '22222222-2222-4222-8222-222222222222';
$recordId = '33333333-3333-4333-8333-333333333333';
$requests = [];
$transport = static function (string $method, string $path, ?array $body, array $headers, ?string $idempotencyKey) use (&$requests): array {
    $requests[] = compact('method', 'path', 'body', 'headers', 'idempotencyKey');
    return ['status' => $method === 'GET' ? 200 : 202, 'body' => ['data' => ['ok' => true], 'request_id' => 'test']];
};

$client = new Client('kh_live_test', 'https://example.test/', 30, $transport);
$calls = [
    ['account.get', 'GET', '/v1/account', static fn () => $client->account()->get(), null],
    ['services.all', 'GET', '/v1/services', static fn () => $client->services()->all(), null],
    ['services.get', 'GET', "/v1/services/{$id}", static fn () => $client->services()->get($id), null],
    ['domains.all', 'GET', '/v1/domains', static fn () => $client->domains()->all(), null],
    ['domains.get', 'GET', "/v1/domains/{$id}", static fn () => $client->domains()->get($id), null],
    ['domains.dns.all', 'GET', "/v1/domains/{$id}/dns", static fn () => $client->domains()->dns()->all($id), null],
    ['domains.dns.create', 'POST', "/v1/domains/{$id}/dns", static fn () => $client->domains()->dns()->create($id, ['type' => 'A'], 'dns-create-1'), ['type' => 'A']],
    ['domains.dns.update', 'PUT', "/v1/domains/{$id}/dns/{$recordId}", static fn () => $client->domains()->dns()->update($id, $recordId, ['content' => '192.0.2.1'], 'dns-update-1'), ['content' => '192.0.2.1']],
    ['domains.dns.delete', 'DELETE', "/v1/domains/{$id}/dns/{$recordId}", static fn () => $client->domains()->dns()->delete($id, $recordId, 'dns-delete-1'), null],
    ['domains.setAutoRenew', 'PUT', "/v1/domains/{$id}/auto-renew", static fn () => $client->domains()->setAutoRenew($id, true, 'domain-renew-1'), ['enabled' => true]],
    ['domains.setNameservers', 'PUT', "/v1/domains/{$id}/nameservers", static fn () => $client->domains()->setNameservers($id, ['ns1.example.test', 'ns2.example.test'], 'domain-ns-1'), ['nameServers' => ['ns1.example.test', 'ns2.example.test']],],
    ['email.all', 'GET', '/v1/email/services', static fn () => $client->email()->all(), null],
    ['email.provision', 'POST', "/v1/email/services/{$id}/provision", static fn () => $client->email()->provision($id, 'email-provision-1'), []],
    ['email.syncDns', 'POST', "/v1/email/services/{$id}/dns/sync", static fn () => $client->email()->syncDns($id, 'email-sync-1'), []],
    ['hosting.all', 'GET', '/v1/hosting/services', static fn () => $client->hosting()->all(), null],
    ['hosting.stats', 'GET', "/v1/hosting/services/{$id}/stats", static fn () => $client->hosting()->stats($id), null],
    ['hosting.panel', 'POST', "/v1/hosting/services/{$id}/panel-access", static fn () => $client->hosting()->createPanelAccess($id, 'filemanager', 'hosting-panel-1'), ['target' => 'filemanager']],
    ['lxc.all', 'GET', '/v1/lxc/instances', static fn () => $client->lxc()->all(), null],
    ['lxc.get', 'GET', "/v1/lxc/instances/{$id}", static fn () => $client->lxc()->get($id), null],
    ['kvm.all', 'GET', '/v1/kvm/instances', static fn () => $client->kvm()->all(), null],
    ['kvm.get', 'GET', "/v1/kvm/instances/{$id}", static fn () => $client->kvm()->get($id), null],
    ['kvm.action', 'POST', "/v1/kvm/instances/{$id}/actions", static fn () => $client->kvm()->action($id, 'restart', 'kvm-action-1'), ['action' => 'restart']],
    ['kvm.autoRenew', 'PUT', "/v1/kvm/instances/{$id}/auto-renew", static fn () => $client->kvm()->setAutoRenew($id, true, 'kvm-renew-1'), ['enabled' => true]],
    ['kvm.snapshots.all', 'GET', "/v1/kvm/instances/{$id}/snapshots", static fn () => $client->kvm()->snapshots()->all($id), null],
    ['kvm.snapshots.create', 'POST', "/v1/kvm/instances/{$id}/snapshots", static fn () => $client->kvm()->snapshots()->create($id, ['name' => 'test', 'description' => 'snapshot'], 'snapshot-create-1'), ['name' => 'test', 'description' => 'snapshot']],
    ['kvm.snapshots.update', 'PATCH', "/v1/kvm/instances/{$id}/snapshots/{$recordId}", static fn () => $client->kvm()->snapshots()->update($id, $recordId, ['name' => 'renamed'], 'snapshot-update-1'), ['name' => 'renamed']],
    ['kvm.snapshots.delete', 'DELETE', "/v1/kvm/instances/{$id}/snapshots/{$recordId}", static fn () => $client->kvm()->snapshots()->delete($id, $recordId, 'snapshot-delete-1'), null],
];

foreach ($calls as [$name, $method, $path, $invoke, $expectedBody]) {
    $invoke();
    $request = $requests[array_key_last($requests)];
    if ($request['method'] !== $method || $request['path'] !== $path || !in_array("Authorization: Bearer kh_live_test", $request['headers'], true)) {
        throw new RuntimeException("Contract mismatch for {$name}");
    }
    if ($method === 'GET' && $request['idempotencyKey'] !== null) {
        throw new RuntimeException("Unexpected idempotency key for {$name}");
    }
    if ($method !== 'GET' && $request['idempotencyKey'] === null) {
        throw new RuntimeException("Missing idempotency key for {$name}");
    }
    if ($expectedBody !== null && $request['body'] !== $expectedBody) {
        throw new RuntimeException("Payload mismatch for {$name}");
    }
}

if (count($requests) !== 27) {
    throw new RuntimeException('Expected 27 SDK operations to be tested');
}

$errorClient = new Client('kh_live_test', 'https://example.test', 30, static fn (): array => [
    'status' => 403,
    'body' => ['error' => ['code' => 'insufficient_scope', 'message' => 'The scope is missing.', 'request_id' => 'request-1']],
]);
try {
    $errorClient->account()->get();
    throw new RuntimeException('Expected ApiException');
} catch (ApiException $error) {
    if ($error->status !== 403 || $error->apiCode !== 'insufficient_scope' || $error->requestId !== 'request-1' || $error->getMessage() !== 'The scope is missing.') {
        throw new RuntimeException('Structured API error was not preserved');
    }
}

echo "PHP SDK contract tests passed (25 operations)\n";
