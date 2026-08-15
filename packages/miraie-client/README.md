# @msawad08/miraie-client

Node.js / TypeScript client for Panasonic MirAIe AC devices (initial stub).

Usage (planned):

```ts
import MiraieClient from '@msawad08/miraie-client';

const client = new MiraieClient({ username: process.env.MIRAIE_USER, password: process.env.MIRAIE_PASS });
await client.connect();
const devices = await client.getDevices();
```

This package is a scaffold and initial stub. Next steps:
- Implement authentication and session handling
- Implement device discovery and state polling
- Implement command protocol and error handling
- Add tests and CI
