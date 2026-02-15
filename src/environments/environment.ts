type RuntimeEnv = {
  BASE_API?: string;
  API_URL?: string;
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
    API_URL: process.env['API_URL'],
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

export const environment = {
  baseApi: fromEnv('BASE_API', 'https://api.backpaking.louisvolat.fr'),
  apiUrl: fromEnv('API_URL', 'https://api.backpaking.louisvolat.fr/api'),
  mapToken: fromEnv(
    'MAP_TOKEN',
    'pk.eyJ1IjoibXJzb2xhcml1cyIsImEiOiJjbHY3c2hrNmMwMWQ3MmlwOHFobGlvMmpxIn0.KFI3ScxDxgP-ftyktLR3PA'
  ),
  weatherApiKey: fromEnv('WEATHER_API_KEY', '102011f938be0f23a8dd32e9073a96ca'),
};
