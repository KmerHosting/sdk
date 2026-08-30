# @kmerhosting/sdk

```bash
npm install @kmerhosting/sdk
```

```ts
import { KmerHostingClient } from "@kmerhosting/sdk";

const client = new KmerHostingClient({ apiKey: process.env.KMERHOSTING_API_KEY });
const domains = await client.domains.list();
```

Use only in a trusted server runtime. The SDK never stores a key.
