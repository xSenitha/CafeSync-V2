# CafeSync

CafeSync is a cafe management app built with Expo / React Native, Express, and MongoDB. It brings menu browsing, orders, table reservations, payment records, and an AI cafe companion into one customer experience, with a separate admin area for daily operations.

## Features

| Area | Included features |
| --- | --- |
| Customer experience | Warm cafe styling, responsive menu cards, search, category filters, and stock-aware cart controls |
| Orders | Dine-in, takeaway, and delivery checkout; active orders and order history |
| Reservations | Table availability, bookings, and reservation management |
| Account | Registration, sign-in, profile settings, saved cards, and payment history |
| Admin | Dashboard, inventory, order management, tables, and payment records |
| Cafe companion | Gemini or OpenAI recommendations, budget suggestions, customer order status, and reservation guidance |

Payment flows currently record application payment statuses. The backend does not integrate a payment gateway to charge cards.

## Project structure

```text
backend/
  src/
    config/             # MongoDB, environment loading, and AI provider selection
    domains/            # Auth, inventory, orders, reservations, payments, cards, assistant
    middlewares/        # Authentication and error handling
    routes/             # API route registration
    app.js              # Express app
    server.js           # API entry point
  scripts/check-ai.js   # Provider connection diagnostic
  test/                 # Assistant and Gemini tests
  .env.example
mobile/
  app/_layout.tsx       # Expo entry layout and application providers
  src/
    api/                # API client and endpoint adapters
    components/         # Shared UI components
    constants/          # Colors, spacing, and typography
    context/            # Authentication and cart state
    navigation/         # Auth, customer, and admin navigation
    screens/            # Auth, customer, and admin screens
  assets/
  .env.example
```

The mobile app uses Expo Router as its entry point and React Navigation for the app's auth, customer, and admin flows. See the [mobile README](mobile/README.md) for mobile development details.

## Local setup

You need Node.js 22 or newer, npm, and a reachable MongoDB database. Run the following commands from the project root in separate terminals.

### 1. Start the backend

```powershell
cd backend
npm install
if (!(Test-Path .env)) { Copy-Item .env.example .env }
```

Edit `backend/.env` with your database connection and JWT settings:

```dotenv
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRE=30d
NODE_ENV=development
```

Then start the API:

```powershell
npm run dev
```

The default API base URL is `http://localhost:5000/api`. `npm start` runs the server without the development watcher.

### 2. Start the app

In a second terminal from the project root:

```powershell
cd mobile
npm install
npm run web
```

Open the local URL printed by Expo. To use Expo Go or a configured emulator instead, run `npm start` and choose the target from Expo's terminal menu.

Register a customer account to explore the app. Accounts with the `admin` role open the admin area. The menu comes from MongoDB inventory; add inventory through the admin area if your database has no menu items.

### API connection on different devices

The app accepts an optional `EXPO_PUBLIC_API_URL` in `mobile/.env`. Include `/api` at the end.

| Target | Example URL |
| --- | --- |
| Web on the API computer | `http://localhost:5000/api` |
| Android emulator | `http://10.0.2.2:5000/api` |
| Physical phone on the same network | `http://YOUR_COMPUTER_LAN_IP:5000/api` |

Without an override, web uses localhost. Native apps use the detected Expo host when available, otherwise the Android emulator address. An explicit URL overrides this detection. Restart Expo after changing the mobile environment configuration.

## Deploy the frontend to Vercel

Use a separate Vercel project for the frontend so the existing backend deployment keeps its own domain. Import this Git repository and configure:

| Vercel setting | Value |
| --- | --- |
| Root Directory | `mobile` |
| Framework Preset | Other |
| Install Command | `npm ci` |
| Build Command | Read from `mobile/vercel.json` |
| Output Directory | `dist` |
| Environment variable | `EXPO_PUBLIC_API_URL=https://cafe-sync-v2.vercel.app/api` |

Set the API URL for both Production and any Preview environments you use, then deploy. Vercel runs the deployment URL check and `npm run build`, which clears Expo's transform cache so changed environment values are included in the exported bundle. Expo exports static HTML for its existing routes, and `cleanUrls` serves those routes without `.html`. See [Expo's publishing guide](https://docs.expo.dev/guides/publishing-websites/) and [Vercel build settings](https://vercel.com/docs/builds/configure-a-build).

`EXPO_PUBLIC_API_URL` is embedded in the web bundle at build time. Change it to your own public HTTPS backend `/api` address if your backend domain changes, and redeploy after editing it. The deployment check rejects a missing URL, HTTP, localhost, or a URL without the `/api` suffix. AI keys and database credentials stay in the backend project's environment settings.

In the backend Vercel project, configure the exact frontend origin after the frontend domain is assigned:

```dotenv
CORS_ORIGINS=https://YOUR_FRONTEND_PROJECT.vercel.app
```

Use comma-separated exact origins for additional custom or preview domains. Local development origins remain allowed. Redeploy the backend after changing its Vercel environment settings. Set `MONGODB_URI`, `JWT_SECRET`, and your selected AI provider settings on that backend project too. API requests must have a working MongoDB connection; the app initializes and reuses it even when Vercel imports `src/app.js` directly.

Before checking the deployed UI, confirm `https://cafe-sync-v2.vercel.app/api/inventory` returns HTTP 200 and a JSON inventory list. A backend HTTP 500/503 must be resolved before menu loading, authentication, orders, and AI chat can work. Then check sign-in, menu images, cart, reservations, and the companion from the frontend domain. Server uploads on Vercel need persistent external storage; local runtime files are not durable deployment storage.

`GET /api/health` checks database readiness. It returns HTTP 200 with `{ "success": true, "status": "ok", "database": "connected" }` once the shared MongoDB connection is available, or the same generic HTTP 503 as other API routes when the connection fails. Health responses are not cached.

If the URI and Atlas IP access list are correct but requests still return 503, open the backend project's Vercel Runtime Logs and request `/api/health`. Look for `[CafeSync database]` and its safe `code`:

| Code | What to check |
| --- | --- |
| `database_not_configured` | `MONGODB_URI` is missing in the running deployment; check the backend project and Production/Preview scope, then redeploy |
| `database_invalid_configuration` | Connection string syntax, unencoded password characters, or invalid driver options |
| `database_authentication_failed` | Database user credentials and authentication database |
| `database_dns_error` | Cluster hostname, SRV DNS resolution, and whether the cluster exists and is active |
| `database_tls_error` | TLS handshake or certificate failure; verify runtime/network compatibility without disabling certificate verification |
| `database_network_error` | Connection refused/reset or unreachable host; verify cluster availability, outbound access and the matching Atlas project's IP access list |
| `database_timeout` | No suitable database server was reachable within the five-second selection timeout; check cluster availability and network access |
| `database_unavailable` | An unclassified connection failure; investigate deployment and cluster availability |

These logs contain fixed diagnostic codes, not connection strings, credentials or raw driver errors. Local startup success does not verify the deployed environment or its network path.

Authentication also requires a non-empty `JWT_SECRET` in the backend Vercel project's Production and Preview environments. Store it as a Secret with a long, randomly generated value, keep the same value across instances, and redeploy after saving it. `JWT_EXPIRE` is a non-secret duration such as `30d`; it defaults to `30d` when omitted. A missing signing secret logs `[CafeSync API] { code: 'auth_not_configured', status: 503 }`; invalid signing settings log `auth_invalid_configuration`. Customers receive a generic temporary-unavailability message. Registration signs the token before saving the account, so a signing failure does not create a partially registered account. Accounts created by earlier failed registration attempts can sign in after the secret is configured.

Unexpected API errors use friendly public messages. The shared handler logs only fixed diagnostic categories and status codes, without raw errors or stacks. Input validation and credential errors remain actionable; internal library messages and database values are not sent to customers. The app also replaces unexpected server and network error details with safe messages.

Commit `mobile/vercel.json`, the build script, `mobile/package-lock.json`, and the `.env.example` templates. Real `.env` files and generated `dist`/`node_modules` remain ignored. Both application folders are tracked as normal source directories in the main repository.

## AI assistant

Open the **Cafe companion** card on the customer menu. You can ask questions such as:

- "Recommend a coffee under Rs. 1,000."
- "What is the status of my latest order?"
- "How can I reserve a table?"

Recommendations use active, in-stock inventory. Tap **Add** to put an item in your cart, then review and confirm checkout. The assistant guides users to orders and reservations; it does not place orders, make payments, or create bookings itself. Dietary and allergen suitability must be confirmed with the cafe team.

### Gemini configuration

Create a key in [Google AI Studio](https://aistudio.google.com/apikey), then set these values in **`backend/.env`**:

```dotenv
AI_PROVIDER=gemini
GEMINI_API_KEY=your_google_ai_studio_key
GEMINI_MODEL=gemini-3.5-flash-lite
```

Restart the backend after configuring the provider. The model is configurable; its availability and quota depend on your Google project. See the [Gemini key setup guide](https://ai.google.dev/gemini-api/docs/api-key).

### OpenAI configuration

To select OpenAI, use:

```dotenv
AI_PROVIDER=openai
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4.1-mini
```

Restart the backend after changing these settings. See the [official OpenAI Responses documentation](https://developers.openai.com/api/reference/resources/responses/methods/create).

Set `AI_PROVIDER` explicitly when both keys are configured. If it is omitted, a Gemini-only key selects Gemini; otherwise the app selects OpenAI. The example environment file sets `AI_PROVIDER=openai`, so change that value when choosing Gemini. Provider failures return the menu guide rather than switching to another provider.

AI keys belong on the backend. Never put them in `mobile/.env` or an `EXPO_PUBLIC_` variable. The backend resolves its `.env` relative to its own directory. Existing shell or deployment environment variables take precedence over that file. The development watcher reloads backend `.env` changes; a server started with `npm start` needs a manual restart.

### Check the provider connection

From `backend`, run:

```powershell
npm run check:ai
```

This sends one small request to the selected provider without connecting to MongoDB or sending customer records. It prints a sanitized result and never prints the key. The request uses the provider's quota and may incur a small API charge.

| Result | What to check |
| --- | --- |
| `available` | The selected provider accepted the diagnostic request |
| `not_configured` | Add the selected provider's API key to `backend/.env` |
| `invalid_configuration` | Set `AI_PROVIDER` to `gemini` or `openai` |
| `authentication_failed` | Verify the key belongs to the selected provider and is active |
| `permission_denied` / `model_unavailable` | Check project permissions and access to the configured model |
| `quota_exceeded` | Check the provider project's credits, billing, and quota limits |
| `rate_limited` | Wait before retrying and check request limits |
| `timeout` / `network_error` | Check the backend computer's network, proxy, or firewall |
| `invalid_response` / `provider_unavailable` | Check provider availability and structured-output compatibility |

For OpenAI, `credit_balance_exhausted` means API credits have run out. Adding another key for the same exhausted account will not restore credits. See [OpenAI error codes](https://developers.openai.com/api/docs/guides/error-codes). For Gemini errors, see [Google's troubleshooting guide](https://ai.google.dev/gemini-api/docs/troubleshooting).

### Guide mode and customer data

When the selected key is missing or the provider fails, the assistant returns a labelled **Menu guide** response and an AI-unavailable notice. The guide can still use the current menu and the signed-in customer's records while the database is available. Assistant fallback logs contain only sanitized failure codes and HTTP statuses.

AI requests include chat text, a limited in-stock menu, and the signed-in customer's recent order and upcoming reservation summaries. Profile addresses, payment records, and product image URLs are excluded. Both providers use structured responses and a 12-second provider timeout. OpenAI requests set `store: false`; Gemini data handling follows the Google API terms for your project. Conversation state stays in the assistant screen's memory and can be cleared with the new-conversation button.

## Assistant API

`POST /api/assistant/chat` requires the existing bearer token in the `Authorization` header.

```json
{
  "message": "Recommend a coffee under Rs. 1,000",
  "history": [
    { "role": "user", "content": "I would like a coffee." },
    { "role": "assistant", "content": "What is your budget?" }
  ]
}
```

Messages are limited to 1,000 characters. History accepts up to 10 messages with `user` or `assistant` roles, each limited to 1,000 characters. Successful responses return `success: true` and a `data` object containing:

| Field | Meaning |
| --- | --- |
| `reply` | Assistant or guide response text |
| `mode` | `ai` or `guide` |
| `recommendations` | Server-validated inventory items, up to three |
| `actions` | Allowed navigation links to menu, orders, or reservations |
| `availability` | Optional safe fallback code and customer-facing notice |

Assistant requests are limited to 20 per minute per user in memory. Multi-instance deployments need a shared rate-limit store.

## Development checks

Run backend tests from `backend`:

```powershell
npm test
```

These use mocked providers and database queries, covering validation, customer scoping, recommendations, provider selection, structured response parsing, failure diagnostics, and rate limiting. They do not require real AI keys or a running MongoDB instance.

If your environment blocks Node's test worker processes:

```powershell
node --test --test-isolation=none test/*.test.js
```

Run these checks from `mobile`:

```powershell
npx tsc --noEmit
npx expo export --platform web --max-workers 1
npx expo export --platform android --output-dir dist/android-check --max-workers 1
```

Live provider access needs a configured key. Verify device interaction and checkout against your development database before release.

## License

[MIT](LICENSE).
