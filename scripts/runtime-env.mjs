import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const outPath =
  process.env.RUNTIME_ENV_JS ??
  '/app/dist/backpacking/browser/assets/env.js';

const runtimeEnv = {
  BASE_API: process.env.BASE_API,
  MAP_TOKEN: process.env.MAP_TOKEN,
  WEATHER_API_KEY: process.env.WEATHER_API_KEY,
};

mkdirSync(dirname(outPath), { recursive: true });

const content = `window.__env = Object.assign(window.__env || {}, ${JSON.stringify(
  runtimeEnv
)});\n`;

writeFileSync(outPath, content, 'utf8');
