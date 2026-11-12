# CafeSync mobile

Expo and React Native client for CafeSync, with web support. Customers can browse and search the menu, manage their cart, place orders, reserve tables, view payments, and chat with the cafe companion. Admin accounts have dashboard, order, inventory, table, and payment management screens.

## Run locally

Start the Express API and MongoDB connection first using the [project setup](../README.md). The client expects the backend on port `5000` by default.

From this `mobile` directory, install dependencies and start the web app:

```bash
npm install
npm run web
```

For Expo Go or an emulator, start the Expo development server instead:

```bash
npm start
```

Open the project through Expo Go or the emulator options shown in the terminal. An Android emulator that is already configured can also be opened with `npm run android`.

## API connection

Optionally copy `.env.example` to `.env` in this directory and set `EXPO_PUBLIC_API_URL`. Include the `/api` suffix:

| Client | Example API URL |
| --- | --- |
| Web on the backend computer | `http://localhost:5000/api` |
| Phone on the same network | `http://192.168.1.100:5000/api` (replace with your computer's LAN address) |
| Android emulator | `http://10.0.2.2:5000/api` |

An explicit `EXPO_PUBLIC_API_URL` always takes precedence over automatic host detection. A phone cannot reach your computer through its own `localhost`; use the LAN address and allow access to backend port `5000`. Restart Expo after changing the environment setting.

Without an override, the client uses `localhost` for web, the Expo development host when available on native devices, and `10.0.2.2` as the native fallback. Set the URL manually if automatic detection chooses the wrong host for your emulator or phone.

AI provider keys belong **only in `backend/.env`**, never in mobile files or `EXPO_PUBLIC_` variables. See [AI assistant setup](../README.md#ai-assistant) for Gemini/OpenAI configuration. The companion uses a clearly labelled menu guide when AI replies are unavailable; the backend is still required.

## Source layout

| Path | Purpose |
| --- | --- |
| `app/_layout.tsx` | Expo Router bootstrap; mounts gesture/safe-area, authentication, and cart providers, then `AppNavigator`. |
| `src/navigation/` | React Navigation flows for authentication, customers, and admins. `AppNavigator` selects the flow from the signed-in user's role. |
| `src/screens/customer/` | Menu and checkout, orders, reservations, payments, profile, saved cards, and the cafe companion. |
| `src/screens/auth/` | Sign-in and registration screens. |
| `src/screens/admin/` | Dashboard and cafe management screens. |
| `src/context/` | Authentication/session and shared cart state. |
| `src/api/` | Axios client, token attachment, backend URL selection, and API adapters. |
| `src/components/`, `src/constants/` | Reusable UI and shared colors, spacing, and typography. |

The application screens and navigation live in `src/`; Expo Router provides the entry point through `app/_layout.tsx`.

## Development checks

For Vercel, set the project Root Directory to `mobile` and supply the HTTPS `EXPO_PUBLIC_API_URL` before the build. The checked-in `vercel.json` configures installation, URL validation, static export, and output directory. Follow the [Vercel deployment steps](../README.md#deploy-the-frontend-to-vercel), including backend CORS configuration.

Run from this directory:

```bash
npx tsc --noEmit
npm run build
```

The first command checks the project's TypeScript files. The second builds the web bundle into `dist/`. Use `npm run lint` for the configured Expo ESLint checks.
