<?php

declare(strict_types=1);

namespace KmerHosting;

use JsonException;
use RuntimeException;

final class Client
{
    private string $apiKey;
    private string $baseUrl;
    /** @var callable|null */
    private $transport;

    public function __construct(?string $apiKey = null, string $baseUrl = 'https://api.kmerhosting.com', private readonly int $timeout = 30, ?callable $transport = null)
    {
        $this->apiKey = $apiKey ?: (getenv('KMERHOSTING_API_KEY') ?: '');
        if ($this->apiKey === '') {
            throw new RuntimeException('Set KMERHOSTING_API_KEY or pass an API key to Client.');
        }
        $this->baseUrl = rtrim($baseUrl, '/');
        $this->transport = $transport;
    }

    public function account(): AccountResource
    {
        return new AccountResource($this);
    }

    public function services(): ServicesResource
    {
        return new ServicesResource($this);
    }

    public function domains(): DomainsResource
    {
        return new DomainsResource($this);
    }

    public function email(): EmailHostingResource
    {
        return new EmailHostingResource($this);
    }

    public function hosting(): SharedHostingResource
    {
        return new SharedHostingResource($this);
    }

    public function vps(): VpsResource
    {
        return new VpsResource($this);
    }

    /** @return array<string, mixed> */
    public function get(string $path): array
    {
        return $this->request('GET', $path);
    }

    /** @param array<string, mixed>|null $body @return array<string, mixed> */
    public function mutate(string $method, string $path, ?array $body = null, ?string $idempotencyKey = null): array
    {
        return $this->request($method, $path, $body, $idempotencyKey ?: $this->idempotencyKey());
    }

    /** @param array<string, mixed>|null $body @return array<string, mixed> */
    private function request(string $method, string $path, ?array $body = null, ?string $idempotencyKey = null): array
    {
        $headers = [
            'Accept: application/json',
            "Authorization: Bearer {$this->apiKey}",
        ];
        if ($idempotencyKey !== null) {
            $headers[] = "Idempotency-Key: {$idempotencyKey}";
        }

        if ($body !== null) {
            $headers[] = 'Content-Type: application/json';
        }

        if ($this->transport !== null) {
            $response = ($this->transport)($method, $path, $body, $headers, $idempotencyKey);
            $status = (int) ($response['status'] ?? 200);
            $payload = is_array($response['body'] ?? null) ? $response['body'] : ['data' => $response['body'] ?? null];
            if ($status < 200 || $status >= 300) {
                $error = is_array($payload['error'] ?? null) ? $payload['error'] : [];
                throw new ApiException(
                    (string) ($error['message'] ?? "KmerHosting API request failed with status {$status}."),
                    $status,
                    (string) ($error['code'] ?? 'request_failed'),
                    isset($error['request_id']) ? (string) $error['request_id'] : null,
                    $payload,
                );
            }
            return $payload;
        }

        $curl = curl_init($this->baseUrl . $path);
        if ($curl === false) {
            throw new RuntimeException('Unable to initialize the HTTP client.');
        }

        curl_setopt_array($curl, [
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => $this->timeout,
            CURLOPT_CONNECTTIMEOUT => min($this->timeout, 10),
            CURLOPT_FAILONERROR => false,
            CURLOPT_POSTFIELDS => $body === null ? null : json_encode($body, JSON_THROW_ON_ERROR),
        ]);

        $raw = curl_exec($curl);
        if ($raw === false) {
            $message = curl_error($curl) ?: 'Unable to reach the KmerHosting API.';
            curl_close($curl);
            throw new RuntimeException($message);
        }
        $status = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
        $requestId = null;
        curl_close($curl);

        $payload = $this->decode($raw);
        if ($status < 200 || $status >= 300) {
            $error = is_array($payload['error'] ?? null) ? $payload['error'] : [];
            throw new ApiException(
                (string) ($error['message'] ?? "KmerHosting API request failed with status {$status}."),
                $status,
                (string) ($error['code'] ?? 'request_failed'),
                isset($error['request_id']) ? (string) $error['request_id'] : $requestId,
                $payload,
            );
        }

        return $payload;
    }

    /** @return array<string, mixed> */
    private function decode(string $raw): array
    {
        if ($raw === '') {
            return [];
        }
        try {
            $decoded = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
            return is_array($decoded) ? $decoded : ['data' => $decoded];
        } catch (JsonException) {
            return ['data' => $raw];
        }
    }

    private function idempotencyKey(): string
    {
        return bin2hex(random_bytes(16));
    }
}

abstract class Resource
{
    public function __construct(protected readonly Client $client)
    {
    }

    protected function id(string $value): string
    {
        return rawurlencode($value);
    }
}

final class AccountResource extends Resource
{
    /** @return array<string, mixed> */
    public function get(): array
    {
        return $this->client->get('/v1/account');
    }
}

final class ServicesResource extends Resource
{
    /** @return array<string, mixed> */
    public function all(): array
    {
        return $this->client->get('/v1/services');
    }

    /** @return array<string, mixed> */
    public function get(string $serviceId): array
    {
        return $this->client->get('/v1/services/' . $this->id($serviceId));
    }
}

final class DomainsResource extends Resource
{
    /** @return array<string, mixed> */
    public function all(): array
    {
        return $this->client->get('/v1/domains');
    }

    /** @return array<string, mixed> */
    public function get(string $domainId): array
    {
        return $this->client->get('/v1/domains/' . $this->id($domainId));
    }

    public function dns(): DnsResource
    {
        return new DnsResource($this->client);
    }

    /** @return array<string, mixed> */
    public function setAutoRenew(string $domainId, bool $enabled, ?string $idempotencyKey = null): array
    {
        return $this->client->mutate('PUT', '/v1/domains/' . $this->id($domainId) . '/auto-renew', ['enabled' => $enabled], $idempotencyKey);
    }

    /** @param list<string> $nameServers @return array<string, mixed> */
    public function setNameservers(string $domainId, array $nameServers, ?string $idempotencyKey = null): array
    {
        return $this->client->mutate('PUT', '/v1/domains/' . $this->id($domainId) . '/nameservers', ['nameServers' => $nameServers], $idempotencyKey);
    }
}

final class DnsResource extends Resource
{
    /** @return array<string, mixed> */
    public function all(string $domainId): array
    {
        return $this->client->get('/v1/domains/' . $this->id($domainId) . '/dns');
    }

    /** @param array<string, mixed> $record @return array<string, mixed> */
    public function create(string $domainId, array $record, ?string $idempotencyKey = null): array
    {
        return $this->client->mutate('POST', '/v1/domains/' . $this->id($domainId) . '/dns', $record, $idempotencyKey);
    }

    /** @param array<string, mixed> $record @return array<string, mixed> */
    public function update(string $domainId, string $recordId, array $record, ?string $idempotencyKey = null): array
    {
        return $this->client->mutate('PUT', '/v1/domains/' . $this->id($domainId) . '/dns/' . $this->id($recordId), $record, $idempotencyKey);
    }

    /** @return array<string, mixed> */
    public function delete(string $domainId, string $recordId, ?string $idempotencyKey = null): array
    {
        return $this->client->mutate('DELETE', '/v1/domains/' . $this->id($domainId) . '/dns/' . $this->id($recordId), null, $idempotencyKey);
    }
}

final class EmailHostingResource extends Resource
{
    /** @return array<string, mixed> */
    public function all(): array
    {
        return $this->client->get('/v1/email/services');
    }

    /** @return array<string, mixed> */
    public function provision(string $serviceId, ?string $idempotencyKey = null): array
    {
        return $this->client->mutate('POST', '/v1/email/services/' . $this->id($serviceId) . '/provision', [], $idempotencyKey);
    }

    /** @return array<string, mixed> */
    public function syncDns(string $serviceId, ?string $idempotencyKey = null): array
    {
        return $this->client->mutate('POST', '/v1/email/services/' . $this->id($serviceId) . '/dns/sync', [], $idempotencyKey);
    }
}

final class SharedHostingResource extends Resource
{
    /** @return array<string, mixed> */
    public function all(): array
    {
        return $this->client->get('/v1/hosting/services');
    }

    /** @return array<string, mixed> */
    public function stats(string $serviceId): array
    {
        return $this->client->get('/v1/hosting/services/' . $this->id($serviceId) . '/stats');
    }

    /** @return array<string, mixed> */
    public function createPanelAccess(string $serviceId, string $target = 'panel', ?string $idempotencyKey = null): array
    {
        return $this->client->mutate('POST', '/v1/hosting/services/' . $this->id($serviceId) . '/panel-access', ['target' => $target], $idempotencyKey);
    }
}

final class VpsResource extends Resource
{
    /** @return array<string, mixed> */
    public function all(): array
    {
        return $this->client->get('/v1/vps/instances');
    }

    /** @return array<string, mixed> */
    public function get(string $serviceId): array
    {
        return $this->client->get('/v1/vps/instances/' . $this->id($serviceId));
    }

    /** @return array<string, mixed> */
    public function action(string $serviceId, string $action, ?string $idempotencyKey = null): array
    {
        return $this->client->mutate('POST', '/v1/vps/instances/' . $this->id($serviceId) . '/actions', ['action' => $action], $idempotencyKey);
    }

    /** @return array<string, mixed> */
    public function setAutoRenew(string $serviceId, bool $enabled, ?string $idempotencyKey = null): array
    {
        return $this->client->mutate('PUT', '/v1/vps/instances/' . $this->id($serviceId) . '/auto-renew', ['enabled' => $enabled], $idempotencyKey);
    }

    public function snapshots(): SnapshotsResource
    {
        return new SnapshotsResource($this->client);
    }
}

final class SnapshotsResource extends Resource
{
    /** @return array<string, mixed> */
    public function all(string $serviceId): array
    {
        return $this->client->get('/v1/vps/instances/' . $this->id($serviceId) . '/snapshots');
    }

    /** @param array{name: string, description?: string} $snapshot @return array<string, mixed> */
    public function create(string $serviceId, array $snapshot, ?string $idempotencyKey = null): array
    {
        return $this->client->mutate('POST', '/v1/vps/instances/' . $this->id($serviceId) . '/snapshots', $snapshot, $idempotencyKey);
    }

    /** @param array{name?: string, description?: string} $snapshot @return array<string, mixed> */
    public function update(string $serviceId, string $snapshotId, array $snapshot, ?string $idempotencyKey = null): array
    {
        return $this->client->mutate('PATCH', '/v1/vps/instances/' . $this->id($serviceId) . '/snapshots/' . $this->id($snapshotId), $snapshot, $idempotencyKey);
    }

    /** @return array<string, mixed> */
    public function delete(string $serviceId, string $snapshotId, ?string $idempotencyKey = null): array
    {
        return $this->client->mutate('DELETE', '/v1/vps/instances/' . $this->id($serviceId) . '/snapshots/' . $this->id($snapshotId), null, $idempotencyKey);
    }
}
