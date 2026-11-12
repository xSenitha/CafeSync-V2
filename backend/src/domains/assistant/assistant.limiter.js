// Per-process protection for development/single-instance deployments. Use a shared
// rate-limit store at the gateway when running multiple API instances.
function createAssistantLimiter({ maxRequests = 20, windowMs = 60000, maxUsers = 2000, now = Date.now } = {}) {
  const windows = new Map();
  return (req, res, next) => {
    const timestamp = now();
    const key = String(req.user.id);
    for (const [userId, value] of windows) {
      if (value.resetAt <= timestamp) windows.delete(userId);
    }
    let window = windows.get(key);
    if (!window) {
      if (windows.size >= maxUsers) windows.delete(windows.keys().next().value);
      window = { count: 0, resetAt: timestamp + windowMs };
      windows.set(key, window);
    }
    if (window.count >= maxRequests) {
      res.setHeader('Retry-After', Math.max(1, Math.ceil((window.resetAt - timestamp) / 1000)));
      return res.status(429).json({ success: false, error: 'Please wait a moment before sending another message.' });
    }
    window.count += 1;
    next();
  };
}

module.exports = { createAssistantLimiter };
