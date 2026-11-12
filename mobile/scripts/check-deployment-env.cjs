// EXPO_PUBLIC_* values are embedded in the exported web bundle. Catch a missing
// production API address before deploying an app that would call localhost.
const value = process.env.EXPO_PUBLIC_API_URL?.trim();

try {
  if (!value) throw new Error('missing');
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash
    || !/\/api\/?$/.test(url.pathname)
    || ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
    throw new Error('invalid');
  }
} catch {
  console.error('Set EXPO_PUBLIC_API_URL in the Vercel frontend project to your public HTTPS backend URL ending in /api, then redeploy.');
  process.exitCode = 1;
}
