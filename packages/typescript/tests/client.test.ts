import { expect, test } from "bun:test";
import { KmerHostingClient } from "../src/index";

test("sends the API key and generated idempotency key for mutations", async () => {
  let request: Request | undefined;
  const client = new KmerHostingClient({
    apiKey: "kh_live_test",
    baseUrl: "https://example.test",
    fetch: async (input, init) => {
      request = new Request(input, init);
      return new Response(JSON.stringify({ data: { queued: true }, request_id: "test" }), { status: 202 });
    },
  });

  const result = await client.vps.action("instance-1", "restart");
  expect(result.data).toEqual({ queued: true });
  expect(request?.headers.get("Authorization")).toBe("Bearer kh_live_test");
  expect(request?.headers.get("Idempotency-Key")).toBeTruthy();
});
