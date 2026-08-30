package com.kmerhosting.sdk;

import com.fasterxml.jackson.databind.JsonNode;

public final class KmerHostingApiException extends RuntimeException {
  private final int status;
  private final String code;
  private final String requestId;
  private final JsonNode body;

  public KmerHostingApiException(String message, int status, String code, String requestId, JsonNode body) {
    super(message);
    this.status = status;
    this.code = code;
    this.requestId = requestId;
    this.body = body;
  }

  public int status() { return status; }
  public String code() { return code; }
  public String requestId() { return requestId; }
  public JsonNode body() { return body; }
}
