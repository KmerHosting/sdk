package com.kmerhosting.sdk;

import static org.junit.jupiter.api.Assertions.assertThrows;
import org.junit.jupiter.api.Test;

class KmerHostingClientTest {
  @Test
  void requiresAnApiKey() {
    assertThrows(IllegalArgumentException.class, () -> new KmerHostingClient(""));
  }
}
