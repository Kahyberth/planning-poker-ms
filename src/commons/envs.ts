import 'dotenv/config';

import * as joi from 'joi';

interface EnvVars {
  PORT: number;
  NATS_SERVERS: string[];
  ORIGIN_CORS: string;
  CLIENT_GATEWAY_URL: string;
  DB_HOST: string;
  DB_PORT: number;
  DB_USERNAME: string;
  DB_PASSWORD: string;
  DB_DATABASE: string;
  WS_PORT: number;
  DEEPSEEK_API_KEY: string;
}

const envsSchema = joi
  .object({
    PORT: joi.number().required(),
    NATS_SERVERS: joi.array().items(joi.string()).required(),
    ORIGIN_CORS: joi.string().required(),
    CLIENT_GATEWAY_URL: joi.string().required(),
    DB_HOST: joi.string().required(),
    DB_PORT: joi.number().required(),
    DB_USERNAME: joi.string().required(),
    DB_PASSWORD: joi.string().required(),
    DB_DATABASE: joi.string().required(),
    WS_PORT: joi.number().required(),
    DEEPSEEK_API_KEY: joi.string().required(),
  })
  .unknown(true);

const { error, value } = envsSchema.validate({
  ...process.env,
  NATS_SERVERS: process.env.NATS_SERVERS?.split(','),
  ORIGIN_CORS: process.env.ORIGIN_CORS,
  CLIENT_GATEWAY_URL: process.env.CLIENT_GATEWAY_URL,
  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT,
  DB_USERNAME: process.env.DB_USERNAME,
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_DATABASE: process.env.DB_DATABASE,
  WS_PORT: process.env.WS_PORT,
  DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
});

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const envVars: EnvVars = value;

export const envs = {
  PORT: envVars.PORT,
  NATS_SERVERS: envVars.NATS_SERVERS,
  ORIGIN_CORS: envVars.ORIGIN_CORS,
  CLIENT_GATEWAY_URL: envVars.CLIENT_GATEWAY_URL,
  DB_HOST: envVars.DB_HOST,
  DB_PORT: envVars.DB_PORT,
  DB_USERNAME: envVars.DB_USERNAME,
  DB_PASSWORD: envVars.DB_PASSWORD,
  DB_DATABASE: envVars.DB_DATABASE,
  WS_PORT: envVars.WS_PORT,
  DEEPSEEK_API_KEY: envVars.DEEPSEEK_API_KEY,
};
