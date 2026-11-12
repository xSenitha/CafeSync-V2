const path = require('path');
const dotenv = require('dotenv');

const ENV_FILE = path.resolve(__dirname, '../../.env');

function loadEnv({ config = dotenv.config } = {}) {
  // Keep explicit shell/process settings authoritative. Resolve the file from
  // this module so launching the API from the workspace root works as well.
  return config({ path: ENV_FILE, quiet: true });
}

module.exports = { loadEnv, ENV_FILE };
