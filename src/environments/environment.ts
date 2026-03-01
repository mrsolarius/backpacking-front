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
const fromEnvOptional = (key: keyof RuntimeEnv) => runtimeEnv[key];

export const environment = {
  baseApi: fromEnvOptional('BASE_API'),
  ssrApiUrl: fromEnvOptional('SSR_API_URL'),
  mapToken: fromEnvOptional('MAP_TOKEN'),
  weatherApiKey: fromEnvOptional('WEATHER_API_KEY'),
};
