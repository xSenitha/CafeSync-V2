# CafeSync

An Expo / React Native cafe app with an Express and MongoDB API. Customers can browse the menu, build a cart, track orders, reserve tables, and manage their profile. Admin screens manage inventory, orders, tables, and payments.

The customer experience uses a warm cream and forest palette, responsive menu cards, search and category filters, stock-aware cart controls, and a cafe companion.

## Run locally

Use Node.js 22 or newer and a MongoDB database. Install each app's dependencies separately.

```powershell
cd backend
npm install
Copy-Item .env.example .env  # Only if you do not already have a .env file
```

Set `MONGODB_URI` and a strong `JWT_SECRET` in `backend/.env`, then run `npm run dev`. The API defaults to port 5000.

In a second terminal:

```powershell
cd mobile
npm install
npm run web
```

For Android or iOS, run `npm start` and open the app in Expo Go. `mobile/.env.example` documents the optional `EXPO_PUBLIC_API_URL`. The app otherwise detects the Expo host for physical devices, uses localhost on web, and defaults to `10.0.2.2` for an Android emulator. When setting the URL on a phone, use the API computer's LAN address, with `/api` at the end.

## Cafe companion

Sign in as a customer and tap the companion card on the menu. It can recommend available items within a budget, show your latest order status, and help you reach the reservation screen. Recommendations can be added to the cart with an explicit tap; customers review and confirm orders and bookings in the existing flows.

To enable Gemini replies, add these **server-only** settings to `backend/.env` and restart the API:

```dotenv
AI_PROVIDER=gemini
GEMINI_API_KEY=your_google_ai_studio_key
GEMINI_MODEL=gemini-3.5-flash-lite
```

Create a Gemini API key in [Google AI Studio](https://aistudio.google.com/apikey). The default Gemini model supports structured output; see [Google's model documentation](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite). Your project's model access and quota still apply.

To use OpenAI instead:

```dotenv
AI_PROVIDER=openai
OPENAI_API_KEY=your_api_key
OPENAI_MODEL=gpt-4.1-mini
```

The model is configurable for each provider. Set `AI_PROVIDER` explicitly when both keys are present. Without `AI_PROVIDER`, existing OpenAI setups keep working; a Gemini-only key selects Gemini automatically. The app never forwards a key to a different provider or automatically switches providers after a failure. Without the selected key, or if that provider times out or fails, the companion returns a clearly labelled **Menu guide** response with an AI availability notice. It never claims verified dietary or allergen suitability.

### Troubleshoot AI replies

From `backend`, run `npm run check:ai` to test the selected provider's key and model without accessing customer records or MongoDB. This makes one small request to Gemini or OpenAI; it prints a safe result and never prints the key. The backend also records a short, sanitized failure code when it switches to the guide. Gemini requests use Google's native `generateContent` endpoint; see the [Gemini API documentation](https://ai.google.dev/api/generate-content) and [key setup guide](https://ai.google.dev/gemini-api/docs/api-key).

For OpenAI, `credit_balance_exhausted` means the account has no API credits remaining. Add API credits to the account/project used by the key, then retry. The normalized `quota_exceeded` diagnostic can also indicate billing, spend, or quota limits needing attention; repeatedly retrying will not restore exhausted credits. See the [official OpenAI error-code guide](https://developers.openai.com/api/docs/guides/error-codes). For Gemini authentication, permissions, quota, or billing problems, use the [Google troubleshooting guide](https://ai.google.dev/gemini-api/docs/troubleshooting).

Keep the key in `backend/.env`. The backend resolves this file relative to its own directory, so starting from the project root also works. The development watcher reloads `.env` changes; an API started with `npm start` needs a restart. Existing shell/deployment environment variables intentionally take precedence over `.env`.

`POST /api/assistant/chat` requires the existing bearer token. Example request:

```json
{
  "message": "Recommend a coffee under Rs. 1,000",
  "history": []
}
```

Messages are limited to 1,000 characters and history to 10 user/assistant messages. Replies include `reply`, `mode` (`ai` or `guide`), real inventory `recommendations`, allowed navigation `actions`, and an optional guide `availability` notice inside `data`. Customer context is scoped to the signed-in user. The selected provider receives a limited menu and recent order/reservation summaries, excluding profile addresses and payment records. Chat text is sent to that provider in AI mode; customers should avoid including sensitive details. Both providers use structured output and a 12-second provider timeout. OpenAI requests additionally set `store: false`; see the [official Responses documentation](https://developers.openai.com/api/reference/resources/responses/methods/create) and [Structured Outputs guide](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses). Gemini data handling follows the Google API terms for your project.

The API limits assistant requests to 20 per minute per user in memory. Use a shared limiter for a multi-instance deployment. Chat stays in screen memory and can be cleared with the new-conversation button.

## Checks

```powershell
cd backend
npm test
```

For environments that block Node test worker processes:

```powershell
node --test --test-isolation=none test/*.test.js
```

```powershell
cd mobile
npx tsc --noEmit
npx expo export --platform web --max-workers 1
npx expo export --platform android --output-dir dist/android-check --max-workers 1
```

The assistant tests cover validation, customer scoping, recommendations, provider parsing/fallbacks, and rate limiting. A live AI check needs your server key; device interaction and real database checkout should be verified against your development environment before release.
