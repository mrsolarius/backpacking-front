type RuntimeEnv = {
  BASE_API?: string;
  SSR_API_URL?: string;
  MAP_TOKEN?: string;
  WEATHER_API_KEY?: string;
};

const readRuntimeEnv = (): RuntimeEnv => {
  const globalAny = globalThis as { __env?: RuntimeEnv };
  return globalAny?.__env ?? {};
};

const readServerEnv = (): RuntimeEnv => {
  if (typeof process === 'undefined' || !process.env) {
    return {};
  }

  return {
    BASE_API: process.env['BASE_API'],
    SSR_API_URL: process.env['SSR_API_URL'],
    MAP_TOKEN: process.env['MAP_TOKEN'],
    WEATHER_API_KEY: process.env['WEATHER_API_KEY'],
  };
};

const runtimeEnv: RuntimeEnv = {
  ...readServerEnv(),
  ...readRuntimeEnv(),
};

const fromEnv = (key: keyof RuntimeEnv, fallback: string) =>
  runtimeEnv[key] ?? fallback;
const fromEnvOptional = (key: keyof RuntimeEnv) => runtimeEnv[key];

export const environment = {
  baseApi: fromEnv('BASE_API', 'http://localhost:4200'),
  ssrApiUrl: fromEnvOptional('SSR_API_URL'),
  mapToken: fromEnv(
    'MAP_TOKEN',
    'pk.eyJ1IjoibXJzb2xhcml1cyIsImEiOiJjbHY3c2hrNmMwMWQ3MmlwOHFobGlvMmpxIn0.KFI3ScxDxgP-ftyktLR3PA'
  ),
  weatherApiKey: fromEnv('WEATHER_API_KEY', '102011f938be0f23a8dd32e9073a96ca'),
};
