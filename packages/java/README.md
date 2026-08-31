# com.kmerhosting:kmerhosting-sdk

```xml
<dependency>
  <groupId>com.kmerhosting</groupId>
  <artifactId>kmerhosting-sdk</artifactId>
  <version>0.1.1</version>
</dependency>
```

```java
var client = new KmerHostingClient(); // reads KMERHOSTING_API_KEY
var services = client.services().list();
```

The SDK requires Java 17+ and returns Jackson `JsonNode` API envelopes.
