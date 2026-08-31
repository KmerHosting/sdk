package com.kmerhosting.sdk;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;

class KmerHostingClientTest {
  private static final String ID = "22222222-2222-4222-8222-222222222222";
  private static final String RECORD_ID = "33333333-3333-4333-8333-333333333333";

  private record Operation(String name, String method, String path, Runnable invoke, String bodyPart) {}

  @Test
  void requiresAnApiKey() {
    assertThrows(IllegalArgumentException.class, () -> new KmerHostingClient(""));
  }

  @Test
  void mapsEveryPublicOperationToTheApiContract() throws IOException {
    List<String> requests = new ArrayList<>();
    AtomicBoolean errorMode = new AtomicBoolean(false);
    AtomicBoolean malformedMode = new AtomicBoolean(false);
    HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    server.createContext("/", exchange -> respond(exchange, requests, errorMode, malformedMode));
    server.start();
    try {
      int port = server.getAddress().getPort();
      KmerHostingClient client = new KmerHostingClient(
          "kh_live_test",
          "http://127.0.0.1:" + port,
          Duration.ofSeconds(5),
          HttpClient.newHttpClient(),
          new ObjectMapper());

      List<Operation> operations = List.of(
          new Operation("account.get", "GET", "/v1/account", () -> client.account().get(), null),
          new Operation("services.list", "GET", "/v1/services", () -> client.services().list(), null),
          new Operation("services.get", "GET", "/v1/services/" + ID, () -> client.services().get(ID), null),
          new Operation("domains.list", "GET", "/v1/domains", () -> client.domains().list(), null),
          new Operation("domains.get", "GET", "/v1/domains/" + ID, () -> client.domains().get(ID), null),
          new Operation("domains.dns.list", "GET", "/v1/domains/" + ID + "/dns", () -> client.domains().dns().list(ID), null),
          new Operation("domains.dns.create", "POST", "/v1/domains/" + ID + "/dns", () -> client.domains().dns().create(ID, java.util.Map.of("type", "A"), "dns-create-1"), "\"type\":\"A\""),
          new Operation("domains.dns.update", "PUT", "/v1/domains/" + ID + "/dns/" + RECORD_ID, () -> client.domains().dns().update(ID, RECORD_ID, java.util.Map.of("content", "192.0.2.1"), "dns-update-1"), "192.0.2.1"),
          new Operation("domains.dns.delete", "DELETE", "/v1/domains/" + ID + "/dns/" + RECORD_ID, () -> client.domains().dns().delete(ID, RECORD_ID, "dns-delete-1"), null),
          new Operation("domains.autoRenew", "PUT", "/v1/domains/" + ID + "/auto-renew", () -> client.domains().setAutoRenew(ID, true, "domain-renew-1"), "\"enabled\":true"),
          new Operation("domains.nameservers", "PUT", "/v1/domains/" + ID + "/nameservers", () -> client.domains().setNameservers(ID, List.of("ns1.example.test", "ns2.example.test"), "domain-ns-1"), "ns1.example.test"),
          new Operation("email.listServices", "GET", "/v1/email/services", () -> client.email().listServices(), null),
          new Operation("email.provision", "POST", "/v1/email/services/" + ID + "/provision", () -> client.email().provision(ID, "email-provision-1"), null),
          new Operation("email.syncDns", "POST", "/v1/email/services/" + ID + "/dns/sync", () -> client.email().syncDns(ID, "email-sync-1"), null),
          new Operation("hosting.listServices", "GET", "/v1/hosting/services", () -> client.hosting().listServices(), null),
          new Operation("hosting.stats", "GET", "/v1/hosting/services/" + ID + "/stats", () -> client.hosting().stats(ID), null),
          new Operation("hosting.panelAccess", "POST", "/v1/hosting/services/" + ID + "/panel-access", () -> client.hosting().createPanelAccess(ID, "filemanager", "hosting-panel-1"), "filemanager"),
          new Operation("vps.list", "GET", "/v1/vps/instances", () -> client.vps().list(), null),
          new Operation("vps.get", "GET", "/v1/vps/instances/" + ID, () -> client.vps().get(ID), null),
          new Operation("vps.action", "POST", "/v1/vps/instances/" + ID + "/actions", () -> client.vps().action(ID, VpsAction.RESTART, "vps-action-1"), "restart"),
          new Operation("vps.autoRenew", "PUT", "/v1/vps/instances/" + ID + "/auto-renew", () -> client.vps().setAutoRenew(ID, true, "vps-renew-1"), "\"enabled\":true"),
          new Operation("vps.snapshots.list", "GET", "/v1/vps/instances/" + ID + "/snapshots", () -> client.vps().snapshots().list(ID), null),
          new Operation("vps.snapshots.create", "POST", "/v1/vps/instances/" + ID + "/snapshots", () -> client.vps().snapshots().create(ID, java.util.Map.of("name", "test", "description", "snapshot"), "snapshot-create-1"), "snapshot"),
          new Operation("vps.snapshots.update", "PATCH", "/v1/vps/instances/" + ID + "/snapshots/" + RECORD_ID, () -> client.vps().snapshots().update(ID, RECORD_ID, java.util.Map.of("name", "renamed"), "snapshot-update-1"), "renamed"),
          new Operation("vps.snapshots.delete", "DELETE", "/v1/vps/instances/" + ID + "/snapshots/" + RECORD_ID, () -> client.vps().snapshots().delete(ID, RECORD_ID, "snapshot-delete-1"), null)
      );

      for (Operation operation : operations) {
        operation.invoke().run();
        String request = requests.get(requests.size() - 1);
        assertTrue(request.startsWith(operation.method() + " " + operation.path() + " "), operation.name());
        assertTrue(request.contains("Authorization: Bearer kh_live_test"), operation.name());
        if (operation.method().equals("GET")) {
          assertTrue(!request.toLowerCase(Locale.ROOT).contains("idempotency-key:"), operation.name());
        } else {
          assertTrue(request.toLowerCase(Locale.ROOT).contains("idempotency-key:"), operation.name());
        }
        if (operation.bodyPart() != null) assertTrue(request.contains(operation.bodyPart()), () -> operation.name() + " request=" + request);
      }
      assertEquals(25, requests.size());

      errorMode.set(true);
      KmerHostingApiException error = assertThrows(KmerHostingApiException.class, () -> client.account().get());
      assertEquals(403, error.status());
      assertEquals("insufficient_scope", error.code());
      assertEquals("request-1", error.requestId());
      assertEquals("The scope is missing.", error.getMessage());
      assertNotNull(error.body());

      malformedMode.set(true);
      KmerHostingApiException malformed = assertThrows(KmerHostingApiException.class, () -> client.account().get());
      assertEquals(502, malformed.status());
      assertEquals("request_failed", malformed.code());
    } finally {
      server.stop(0);
    }
  }

  private static void respond(HttpExchange exchange, List<String> requests, AtomicBoolean errorMode, AtomicBoolean malformedMode) throws IOException {
    String body = new String(exchange.getRequestBody().readAllBytes());
    String headers = exchange.getRequestHeaders().entrySet().stream()
        .map(entry -> entry.getKey() + ": " + String.join(",", entry.getValue()))
        .collect(Collectors.joining("; "));
    requests.add(exchange.getRequestMethod() + " " + URI.create(exchange.getRequestURI().toString()).getPath() + " " + headers + " " + body);
    int status = malformedMode.get() ? 502 : (errorMode.get() ? 403 : (exchange.getRequestMethod().equals("GET") ? 200 : 202));
    String response = malformedMode.get()
        ? "upstream unavailable"
        : errorMode.get()
        ? "{\"error\":{\"code\":\"insufficient_scope\",\"message\":\"The scope is missing.\",\"request_id\":\"request-1\"}}"
        : "{\"data\":{\"ok\":true},\"request_id\":\"test\"}";
    exchange.getResponseHeaders().add("Content-Type", "application/json");
    exchange.sendResponseHeaders(status, response.getBytes().length);
    exchange.getResponseBody().write(response.getBytes());
    exchange.close();
  }
}
