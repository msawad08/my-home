# Panasonic MirAIe AC Control App — Implementation Plan

## 1. Goal

Build a small self-hosted web application that provides a simple login-protected UI for controlling Panasonic MirAIe AC units and exposes a secure REST API that can be called from iOS Shortcuts.

The first version should stay intentionally simple:

- Next.js web app
- Simple application login
- Panasonic MirAIe account/device integration
- AC power, temperature, mode and fan controls
- Current AC state/status
- REST API for iOS Shortcuts
- Secure credential handling
- Docker-based deployment

## 2. Recommended Architecture

```text
                         ┌──────────────────────┐
                         │      iPhone / iOS     │
                         │      Shortcuts        │
                         └──────────┬───────────┘
                                    │ HTTPS
                                    ▼
┌──────────────────────────────────────────────────────────┐
│                    Next.js Application                    │
│                                                          │
│  ┌────────────────┐       ┌───────────────────────────┐  │
│  │ Web UI         │       │ REST API                  │  │
│  │ Login          │       │ /api/ac/...               │  │
│  │ AC Dashboard   │──────▶│ Auth + Validation          │  │
│  └────────────────┘       └─────────────┬─────────────┘  │
│                                         │                │
│                              ┌──────────▼───────────┐    │
│                              │ MirAIe Service        │    │
│                              │ Adapter / Client      │    │
│                              └──────────┬───────────┘    │
└─────────────────────────────────────────┼────────────────┘
                                          │
                                  MirAIe API / MQTT
                                          │
                                          ▼
                               ┌─────────────────────┐
                               │ Panasonic MirAIe AC │
                               └─────────────────────┘
```

## 3. Open-Source MirAIe Integration

Use an existing open-source MirAIe implementation rather than reverse-engineering the protocol from scratch.

### Primary candidate

`selvakk2k/ha-miraie-ac-in`

GitHub:
https://github.com/selvakk2k/ha-miraie-ac-in

This repository appears to be one of the more actively maintained MirAIe integrations currently available; GitHub's air-conditioner topic listing shows it was updated on July 31, 2026. It targets Panasonic MirAIe ACs in the Indian market and provides climate control, energy monitoring and device sensors.

A related Python package, `miraie-ac-in`, is also available on PyPI and describes itself as a Python API client for Panasonic MirAIe ACs, including MQTT message parsing, connection handling and telemetry decoding:

https://pypi.org/project/miraie-ac-in/

### Alternative/reference implementations

- `chrissmartin/hass-panasonic-miraie` — direct Home Assistant integration with temperature, mode and fan controls.
  https://github.com/chrissmartin/hass-panasonic-miraie
- `milothomas/ha-miraie-ac` — older implementation that helped establish the MirAIe API/MQTT approach.
  https://github.com/milothomas/ha-miraie-ac
- `thisisharishr/homebridge-panasonic-miraie-ac-platform` — useful reference if HomeKit integration behavior is needed.
  https://github.com/thisisharishr/homebridge-panasonic-miraie-ac-platform

Important: before implementation, verify the selected library against the exact Panasonic AC model and MirAIe account/device setup. The MirAIe ecosystem uses cloud authentication and MQTT for device communication in the existing integrations, so the application should treat the upstream library as an adapter rather than duplicating its protocol logic.

## 4. Technology Stack

### Frontend / Application

- Next.js
- TypeScript
- React
- Tailwind CSS
- shadcn/ui
- Next.js App Router

### Backend

Initially keep the backend inside Next.js:

- Route Handlers for REST APIs
- Server-only MirAIe service
- Zod for request validation
- Secure HTTP-only session cookie

Do not expose MirAIe credentials or MQTT credentials to the browser.

### MirAIe integration

Preferred approach:

```text
Next.js
   ↓
MirAIe Adapter
   ↓
Python `miraie-ac-in` library
   ↓
MirAIe API / MQTT
```

There are two reasonable implementation options:

#### Option A — Python sidecar service

Recommended if the existing Python library is the easiest/most reliable integration.

```text
Next.js
  │
  │ HTTP
  ▼
Python FastAPI
  │
  ▼
miraie-ac-in
  │
  ▼
MirAIe
```

This keeps the Next.js application clean and avoids trying to port Python MQTT/protocol logic into TypeScript.

#### Option B — Native TypeScript implementation

Only choose this if the MirAIe protocol/client can be implemented reliably in Node.js.

This removes the Python service but creates more maintenance responsibility.

For the first version, Option A is preferred.

## 5. Application Structure

Suggested repository:

```text
miraie-ac-control/
├── apps/
│   ├── web/
│   │   ├── app/
│   │   │   ├── login/
│   │   │   ├── dashboard/
│   │   │   └── api/
│   │   │       ├── auth/
│   │   │       └── ac/
│   │   ├── components/
│   │   ├── lib/
│   │   │   ├── auth/
│   │   │   ├── miraie/
│   │   │   └── validation/
│   │   └── middleware.ts
│   │
│   └── miraie-service/
│       ├── app/
│       │   ├── main.py
│       │   ├── api/
│       │   └── services/
│       └── requirements.txt
│
├── docker-compose.yml
├── .env.example
├── README.md
└── docs/
```

For a very small personal project, this can initially be a single Next.js repository plus a Python service directory rather than a full monorepo.

## 6. Authentication

The application login is separate from the Panasonic MirAIe login.

### App authentication

For the personal/self-hosted version:

- One application user initially
- Username/email + password
- Password stored as a strong hash
- HTTP-only, Secure, SameSite cookie
- Session expiry
- CSRF protection where applicable
- Login rate limiting

Do not put the MirAIe password in client-side JavaScript.

### Credentials

Store secrets only in server-side environment variables or a secrets manager.

Example:

```env
APP_USERNAME=admin
APP_PASSWORD_HASH=...

# MirAIe credentials are server-side only.
MIRAIE_USERNAME=...
MIRAIE_PASSWORD=...

MIRAIE_SERVICE_URL=http://miraie-service:8000

# Long-lived API key configuration for iOS Shortcuts.
API_KEY_EXPIRY_DAYS=365
```

The iOS Shortcut must never contain the MirAIe username/password. It should contain only the generated application API key. API keys should default to a long lifetime such as 365 days, with revocation and rotation support.

For production, prefer a generated password hash instead of storing `APP_PASSWORD` directly.

## 7. AC Dashboard

The first dashboard should be intentionally simple.

### Device card

Show:

- AC name
- Online/offline status
- Current room temperature
- Target temperature
- Power state
- Current mode
- Fan speed

### Controls

Provide:

- Power ON/OFF
- Temperature +/- controls
- Temperature selector
- Mode:
  - Auto
  - Cool
  - Dry
  - Fan
  - Other modes supported by the device
- Fan speed:
  - Auto
  - Low
  - Medium
  - High
  - Quiet, if supported

Only show capabilities actually reported by the AC.

## 8. REST API

Design the API around the AC rather than exposing MirAIe internals.

### Authentication

```http
POST /api/auth/login
```

For iOS Shortcuts, use a separate API token rather than depending on the browser session.

Example:

```http
Authorization: Bearer <API_TOKEN>
```

### Device list

```http
GET /api/ac
```

Response:

```json
{
  "devices": [
    {
      "id": "bedroom-ac",
      "name": "Bedroom AC",
      "online": true,
      "power": true,
      "mode": "cool",
      "targetTemperature": 24,
      "currentTemperature": 27,
      "fanSpeed": "auto"
    }
  ]
}
```

### Get device state

```http
GET /api/ac/{deviceId}
```

### Power

```http
POST /api/ac/{deviceId}/power

{
  "enabled": true
}
```

### Temperature

```http
POST /api/ac/{deviceId}/temperature

{
  "temperature": 24
}
```

### Mode

```http
POST /api/ac/{deviceId}/mode

{
  "mode": "cool"
}
```

### Fan

```http
POST /api/ac/{deviceId}/fan

{
  "speed": "auto"
}
```

### Generic command

Optionally support:

```http
POST /api/ac/{deviceId}/command

{
  "power": true,
  "mode": "cool",
  "temperature": 24,
  "fanSpeed": "auto"
}
```

This is useful for iOS Shortcuts because one Shortcut action can configure the complete desired state.

## 9. iOS Shortcuts Integration

The goal is to make Shortcuts extremely simple.

Example Shortcut:

```text
Ask for Input
    ↓
Set AC Temperature
    ↓
POST /api/ac/bedroom-ac/temperature
    ↓
Show Notification
```

Useful shortcuts:

### Turn AC on

```http
POST /api/ac/bedroom-ac/power
{
  "enabled": true
}
```

### Turn AC off

```http
POST /api/ac/bedroom-ac/power
{
  "enabled": false
}
```

### Set bedroom to 24°C

```http
POST /api/ac/bedroom-ac/command
{
  "power": true,
  "mode": "cool",
  "temperature": 24,
  "fanSpeed": "auto"
}
```

### Get current temperature

```http
GET /api/ac/bedroom-ac
```

The Shortcut can read the JSON response and display the current temperature/state.

## 10. API Security

Do not expose the API publicly without authentication.

Minimum:

```text
HTTPS
  ↓
API token
  ↓
Request validation
  ↓
Rate limiting
  ↓
MirAIe service
```

For a personal installation, the best option may be to keep the service private behind a VPN or private network.

If remote access is required, use HTTPS and a strong API token.

Avoid:

- Putting MirAIe credentials in Shortcuts
- Putting credentials in frontend code
- Exposing MQTT directly to the internet
- Creating unauthenticated `/api/ac/...` endpoints
- Logging passwords or tokens

## 11. Caching and State

Do not call the MirAIe service unnecessarily for every UI render.

Use a small state/cache layer.

Initial implementation:

```text
Request
  ↓
Next.js API
  ↓
MirAIe service
  ↓
Current state
```

Later:

```text
MirAIe MQTT
    ↓
State Manager
    ↓
Redis
    ↓
Next.js API
    ↓
Web UI / Shortcuts
```

For version 1, Redis is optional.

## 12. Error Handling

Normalize upstream errors into application-level errors.

Example:

```json
{
  "success": false,
  "error": {
    "code": "MIRAIE_DEVICE_OFFLINE",
    "message": "The AC is currently offline."
  }
}
```

Useful error codes:

- `AUTH_REQUIRED`
- `INVALID_DEVICE`
- `INVALID_COMMAND`
- `MIRAIE_AUTH_FAILED`
- `MIRAIE_DEVICE_OFFLINE`
- `MIRAIE_TIMEOUT`
- `MIRAIE_UPSTREAM_ERROR`

Do not expose raw MQTT/API credentials or internal stack traces.

## 13. Logging

Log:

- Login success/failure
- API request method/path
- Device command
- Command success/failure
- MirAIe connection state

Do not log:

- Passwords
- API tokens
- MQTT credentials
- Session cookies
- Full upstream authentication payloads

Example:

```text
2026-08-15 19:20:12 INFO AC command
device=bedroom-ac
command=set_temperature
value=24
result=success
```

## 14. Docker Deployment

Use Docker Compose initially.

```text
docker-compose
├── web
└── miraie-service
```

Example flow:

```text
Internet / LAN
      │
      ▼
 Reverse Proxy
      │
      ▼
 Next.js
      │
      ▼
 FastAPI
      │
      ▼
 MirAIe
```

Possible reverse proxy:

- Caddy
- Nginx
- Traefik

Caddy is a good option for a personal project because HTTPS configuration can stay simple.

## 15. Development Phases

### Phase 1 — Validate MirAIe integration

- [ ] Identify exact AC model
- [ ] Confirm it is registered in MirAIe
- [ ] Clone/test the current `ha-miraie-ac-in` implementation
- [ ] Test MirAIe authentication
- [ ] Discover AC devices
- [ ] Verify reading state
- [ ] Verify power control
- [ ] Verify temperature control
- [ ] Verify mode control
- [ ] Verify fan control

### Phase 2 — Build MirAIe service

- [ ] Create FastAPI service
- [ ] Wrap `miraie-ac-in`
- [ ] Implement device discovery
- [ ] Implement device state
- [ ] Implement power command
- [ ] Implement temperature command
- [ ] Implement mode command
- [ ] Implement fan command
- [ ] Normalize errors
- [ ] Add health endpoint
- [ ] Add structured logging

### Phase 3 — Build Next.js application

- [ ] Create Next.js TypeScript project
- [ ] Add Tailwind/shadcn
- [ ] Create login page
- [ ] Implement session authentication
- [ ] Create dashboard
- [ ] Create AC device card
- [ ] Add power control
- [ ] Add temperature control
- [ ] Add mode control
- [ ] Add fan control
- [ ] Add loading/error states

### Phase 4 — REST API

- [ ] Add API authentication
- [ ] Add `GET /api/ac`
- [ ] Add `GET /api/ac/:id`
- [ ] Add power endpoint
- [ ] Add temperature endpoint
- [ ] Add mode endpoint
- [ ] Add fan endpoint
- [ ] Add generic command endpoint
- [ ] Add Zod validation
- [ ] Add rate limiting
- [ ] Add API documentation

### Phase 5 — iOS Shortcuts

- [ ] Create API token
- [ ] Create "AC On" Shortcut
- [ ] Create "AC Off" Shortcut
- [ ] Create "Set AC Temperature" Shortcut
- [ ] Create "AC Status" Shortcut
- [ ] Test JSON parsing
- [ ] Test error handling

### Phase 6 — Deployment

- [ ] Create Dockerfiles
- [ ] Create Docker Compose
- [ ] Configure environment variables
- [ ] Add reverse proxy
- [ ] Enable HTTPS
- [ ] Configure firewall
- [ ] Deploy
- [ ] Test from iPhone
- [ ] Test after container restart

## 16. Suggested MVP

Do not build a full smart-home platform initially.

The MVP should contain only:

```text
Login
  ↓
Dashboard
  ├── Bedroom AC
  │    ├── Power
  │    ├── Temperature
  │    ├── Mode
  │    ├── Fan Speed
  │    └── Current Temperature
  │
  └── API
       ├── GET state
       ├── Power
       ├── Temperature
       ├── Mode
       └── Fan
```

Once this works reliably, add:

- Multiple ACs
- Scheduling
- Presets
- Energy usage
- HomeKit integration
- Siri Shortcuts
- Redis
- Notifications
- Temperature-based automations

## 17. Recommended Presets

A useful second iteration could add presets:

```json
{
  "name": "Sleep",
  "power": true,
  "mode": "cool",
  "temperature": 25,
  "fanSpeed": "quiet"
}
```

API:

```http
POST /api/ac/{deviceId}/presets/sleep
```

Other presets:

- Sleep
- Max Cool
- Normal
- Away
- Off

This will make Siri/Shortcuts integration much easier.

## 18. Testing Strategy

### Unit tests

Test:

- Authentication
- API validation
- MirAIe adapter
- Command mapping
- Error mapping

### Integration tests

Test against a real MirAIe AC:

```text
Login
  ↓
Discover device
  ↓
Read state
  ↓
Change temperature
  ↓
Read state
  ↓
Turn off
  ↓
Read state
```

### API tests

Verify:

- Missing token → 401
- Invalid token → 401
- Invalid device → 404
- Invalid temperature → 400
- Valid command → 200
- MirAIe offline → appropriate 5xx/503 response

## 19. Important Technical Decision

The key decision is whether to embed the MirAIe implementation directly into Next.js or isolate it behind Python.

Recommended:

```text
Next.js
   │
   │ REST/internal HTTP
   ▼
FastAPI
   │
   ▼
miraie-ac-in
   │
   ├── MirAIe authentication
   ├── MQTT connection
   ├── Device discovery
   └── AC commands
```

This is preferable for the MVP because the existing MirAIe ecosystem is primarily Python/Home Assistant based, and the actively maintained `miraie-ac-in` package already handles the protocol details.

The Next.js application should own the user experience and public API, while Python owns MirAIe-specific protocol behavior.


## 22. Provider-Agnostic Smart Service Architecture

The application should be designed around a **provider adapter interface** rather than making MirAIe a hard-coded part of the application.

The goal is to make adding another smart-home provider later require a new adapter/module, without rewriting the dashboard, authentication, REST API or iOS Shortcut integration.

### Provider architecture

```text
                    ┌─────────────────────┐
                    │   Next.js API/UI    │
                    └──────────┬──────────┘
                               │
                       Smart Device Service
                               │
                    ┌──────────▼──────────┐
                    │ Provider Registry   │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
       ┌────────────┐   ┌────────────┐   ┌────────────┐
       │  MirAIe    │   │ Provider B │   │ Provider C │
       │  Adapter   │   │  Adapter   │   │  Adapter   │
       └─────┬──────┘   └─────┬──────┘   └─────┬──────┘
             │                │                │
             ▼                ▼                ▼
         Panasonic        Future Service     Future Service
```

### Common provider interface

Define a common interface for smart devices.

```typescript
interface SmartHomeProvider {
  id: string;
  name: string;

  authenticate(): Promise<void>;

  getDevices(): Promise<SmartDevice[]>;

  getDeviceState(deviceId: string): Promise<DeviceState>;

  executeCommand(
    deviceId: string,
    command: DeviceCommand
  ): Promise<DeviceState>;

  disconnect?(): Promise<void>;
}
```

The application should work with this interface instead of calling MirAIe-specific code directly.

### Device model

Use a normalized device model:

```typescript
interface SmartDevice {
  id: string;
  providerId: string;
  name: string;
  type: "ac" | "light" | "fan" | "plug" | "thermostat" | "other";
  capabilities: string[];
}
```

Example:

```json
{
  "id": "bedroom-ac",
  "providerId": "miraie",
  "name": "Bedroom AC",
  "type": "ac",
  "capabilities": [
    "power",
    "temperature",
    "mode",
    "fanSpeed"
  ]
}
```

This allows the UI to render controls based on capabilities instead of provider-specific logic.

## 23. Provider Modules

Recommended project structure:

```text
src/
├── providers/
│   ├── core/
│   │   ├── types.ts
│   │   ├── provider.ts
│   │   ├── device.ts
│   │   └── registry.ts
│   │
│   ├── miraie/
│   │   ├── index.ts
│   │   ├── client.ts
│   │   ├── adapter.ts
│   │   ├── mapper.ts
│   │   └── config.ts
│   │
│   ├── tuya/
│   │   └── ...
│   │
│   └── future-provider/
│       └── ...
│
├── services/
│   ├── device-service.ts
│   ├── command-service.ts
│   └── auth-service.ts
│
├── app/
│   └── api/
│
└── components/
```

For the Python MirAIe service, use the same separation:

```text
miraie-service/
├── providers/
│   ├── base.py
│   └── miraie/
│       ├── client.py
│       ├── adapter.py
│       └── mapper.py
├── services/
├── api/
└── main.py
```

## 24. Provider Registry

The application should register providers centrally.

Example:

```typescript
providerRegistry.register(
  new MiraieProvider({
    username: process.env.MIRAIE_USERNAME!,
    password: process.env.MIRAIE_PASSWORD!
  })
);
```

A future provider could be added as:

```typescript
providerRegistry.register(
  new TuyaProvider({
    clientId: process.env.TUYA_CLIENT_ID!,
    clientSecret: process.env.TUYA_CLIENT_SECRET!
  })
);
```

No changes should be required to the generic device API.

## 25. Provider-Specific Credentials

Each provider owns its own credentials.

MirAIe:

```env
MIRAIE_USERNAME=...
MIRAIE_PASSWORD=...
```

Future provider:

```env
TUYA_CLIENT_ID=...
TUYA_CLIENT_SECRET=...
```

The frontend must never receive these values.

The provider adapter should be the only component allowed to access provider credentials.

## 26. Generic API

The public API should also remain provider-agnostic.

Instead of:

```http
POST /api/miraie/ac/bedroom/power
```

Use:

```http
POST /api/devices/bedroom-ac/commands
```

Example:

```json
{
  "type": "power",
  "value": true
}
```

Or:

```http
POST /api/devices/bedroom-ac/command
```

```json
{
  "power": true,
  "mode": "cool",
  "temperature": 24,
  "fanSpeed": "auto"
}
```

The application resolves:

```text
device ID
    ↓
provider ID
    ↓
provider registry
    ↓
provider adapter
    ↓
provider API
```

This means iOS Shortcuts remain unchanged when another provider is added.

## 27. API Key Design

The API key should be independent of provider credentials.

Environment/configuration:

```env
API_KEY_EXPIRY_DAYS=365
```

For production, API keys should preferably be stored as hashes rather than plaintext.

Example conceptual database record:

```json
{
  "name": "iPhone Shortcut",
  "keyHash": "...",
  "createdAt": "2026-08-15T00:00:00Z",
  "expiresAt": "2027-08-15T00:00:00Z",
  "revokedAt": null
}
```

The iOS Shortcut stores:

```text
Authorization: Bearer <LONG_LIVED_API_KEY>
```

The API validates:

1. Key exists
2. Key is not revoked
3. Current time is before expiry
4. Request is authorized

### Key rotation

Provide an admin page:

```text
API Keys

iPhone Shortcut
Created: 15 Aug 2026
Expires: 15 Aug 2027
Status: Active

[Generate New Key] [Revoke]
```

When a key is rotated, the user only needs to update the Shortcut once.

Do not require MirAIe credentials to be changed when rotating API keys.

## 28. Configuration Separation

Separate application configuration from provider configuration.

```text
APP
├── APP_URL
├── SESSION_SECRET
├── API_KEY_EXPIRY_DAYS
└── ...

MIRAIE
├── MIRAIE_USERNAME
├── MIRAIE_PASSWORD
└── ...

FUTURE PROVIDERS
├── TUYA_CLIENT_ID
├── TUYA_CLIENT_SECRET
└── ...
```

This makes the system easier to extend and keeps provider credentials isolated.

## 29. Updated Architecture

The final recommended architecture is:

```text
                         iPhone / iOS Shortcuts
                                  │
                                  │ HTTPS + API Key
                                  ▼
                    ┌──────────────────────────┐
                    │        Next.js           │
                    │                          │
                    │  Login / Dashboard       │
                    │  Generic Device API      │
                    │  API Key Authentication  │
                    └────────────┬─────────────┘
                                 │
                         Device Service
                                 │
                       Provider Registry
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
              ▼                  ▼                  ▼
        ┌───────────┐      ┌───────────┐      ┌───────────┐
        │  MirAIe   │      │  Tuya     │      │  Future   │
        │  Adapter  │      │  Adapter  │      │ Provider  │
        └─────┬─────┘      └─────┬─────┘      └─────┬─────┘
              │                  │                  │
              ▼                  ▼                  ▼
        Panasonic             Tuya API          Provider API
          MirAIe
```

## 30. Updated Development Priorities

The implementation order should now be:

### Step 1 — Core provider abstraction

- [ ] Define `SmartHomeProvider`
- [ ] Define normalized `SmartDevice`
- [ ] Define normalized `DeviceState`
- [ ] Define `DeviceCommand`
- [ ] Build provider registry
- [ ] Build generic device service

### Step 2 — MirAIe provider

- [ ] Implement MirAIe adapter
- [ ] Connect `miraie-ac-in`
- [ ] Load credentials from environment
- [ ] Discover devices
- [ ] Map MirAIe state to normalized state
- [ ] Map generic commands to MirAIe commands

### Step 3 — Generic API

- [ ] `GET /api/devices`
- [ ] `GET /api/devices/:id`
- [ ] `POST /api/devices/:id/command`
- [ ] Provider-independent request/response models

### Step 4 — Authentication

- [ ] Web login
- [ ] Secure session
- [ ] API key generation
- [ ] One-year default expiry
- [ ] API key validation
- [ ] API key revocation
- [ ] API key rotation

### Step 5 — UI

- [ ] Generic device dashboard
- [ ] Capability-driven controls
- [ ] MirAIe AC support
- [ ] Loading/error states

### Step 6 — iOS Shortcuts

- [ ] Store long-lived API key
- [ ] Create generic device status Shortcut
- [ ] Create power Shortcut
- [ ] Create temperature Shortcut
- [ ] Create preset Shortcut

### Step 7 — Add another provider

Only after MirAIe works end-to-end, use a second provider as an architecture validation exercise.

The second provider should be implemented as a new adapter without modifying the generic UI/API contracts.

## 31. Architectural Principle

The most important design rule is:

> **The application knows about smart devices and capabilities; providers know how to communicate with those devices.**

Avoid code such as:

```typescript
if (provider === "miraie") {
  // MirAIe-specific logic everywhere
}
```

Prefer:

```typescript
const provider = providerRegistry.get(device.providerId);

return provider.executeCommand(
  device.id,
  command
);
```

This keeps MirAIe replaceable and makes future integrations much easier.

## 20. Definition of Done

The MVP is complete when:

- [ ] I can open the Next.js app and log in.
- [ ] My MirAIe AC appears automatically.
- [ ] I can see current temperature and AC state.
- [ ] I can turn the AC on/off.
- [ ] I can change target temperature.
- [ ] I can change mode.
- [ ] I can change fan speed.
- [ ] The same operations work through REST API.
- [ ] An iOS Shortcut can turn the AC on/off.
- [ ] An iOS Shortcut can set temperature.
- [ ] The API is authenticated.
- [ ] MirAIe credentials never reach the browser.
- [ ] The application runs through Docker Compose.
- [ ] The application can be accessed securely from the iPhone.

## 21. Next Step

Start with the MirAIe adapter before building the UI.

The first technical milestone should be:

```text
MirAIe credentials
       ↓
miraie-ac-in
       ↓
Discover my AC
       ↓
Read current state
       ↓
Turn AC on/off
       ↓
Set temperature
```

Once this works reliably from the server, build the Next.js UI and REST API around that adapter.

### Sources checked

- Panasonic MirAIe product information: https://lsin.panasonic.com/smart-homes-and-buildings/residential/miraie
- `selvakk2k/ha-miraie-ac-in`: https://github.com/selvakk2k/ha-miraie-ac-in
- `miraie-ac-in` Python package: https://pypi.org/project/miraie-ac-in/
- `chrissmartin/hass-panasonic-miraie`: https://github.com/chrissmartin/hass-panasonic-miraie
- `milothomas/ha-miraie-ac`: https://github.com/milothomas/ha-miraie-ac
- `thisisharishr/homebridge-panasonic-miraie-ac-platform`: https://github.com/thisisharishr/homebridge-panasonic-miraie-ac-platform
