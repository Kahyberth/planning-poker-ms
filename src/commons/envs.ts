import 'dotenv/config';

import * as joi from 'joi';

interface EnvVars {
  PORT: number;
  NATS_SERVERS: string[];
  ORIGIN_CORS: string;
  DATABASE_URL: string;
}

const envsSchema = joi
  .object({
    PORT: joi.number().required(),
    NATS_SERVERS: joi.array().items(joi.string()).required(),
    ORIGIN_CORS: joi.string().required(),
    DATABASE_URL: joi.string().required(),
  })
  .unknown(true);

const { error, value } = envsSchema.validate({
  ...process.env,
  NATS_SERVERS: process.env.NATS_SERVERS?.split(','),
  ORIGIN_CORS: process.env.ORIGIN_CORS?.split(','),
  DATABASE_URL: process.env.DATABASE_URL,
});

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const envVars: EnvVars = value;

export const envs = {
  PORT: envVars.PORT,
  NATS_SERVERS: envVars.NATS_SERVERS,
  ORIGIN_CORS: envVars.ORIGIN_CORS,
  DATABASE_URL: envVars.DATABASE_URL,
};
