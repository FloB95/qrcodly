// ---------------------------
// GENERAL CONSTANTS
// ---------------------------

import { env } from './env';

export const IN_PRODUCTION = env.NODE_ENV === 'production';
export const IN_DEVELOPMENT = env.NODE_ENV === 'development';
export const IN_TEST = env.NODE_ENV === 'test';
export const API_BASE_PATH: string = '/api/v1';
export const FASTIFY_LOGGING: boolean = false;

export const RATE_LIMIT_MAX: number = 30;
export const RATE_LIMIT_TIME_WINDOW: string = '1 minute';
export const ALLOWED_ORIGINS: string[] = [env.FRONTEND_URL, 'http://localhost:3000'];

export const DEFAULT_TIME_ZONE: string = 'Europe/Berlin';

// Lowest priority, meaning shut down happens after other groups
export const LOWEST_SHUTDOWN_PRIORITY = 0;
export const DEFAULT_SHUTDOWN_PRIORITY = 100;
// Highest priority, meaning shut down happens before all other groups
export const HIGHEST_SHUTDOWN_PRIORITY = 200;

// censors fields in the log output
export const LOGGER_REDACT_PATHS: string[] = ['password', 'user.password'];

// ---------------------------
// MAILER CONSTANTS
// ---------------------------
export const DEFAULT_FROM_MAIL: string = 'fb@medium.ag';

// ---------------------------
// DATABASE CONSTANTS
// ---------------------------
export const DB_MIGRATION_FOLDER: string = './src/core/db/migrations/';
export const DB_SCHEMA_FILE: string = './src/core/db/schemas/index.ts';
export const DB_LOGGING: boolean = false;
export const DEFAULT_PAGE_SIZE: number = 10;

// ---------------------------
// File Storage Constants
// ---------------------------
export const DEFAULT_PUBLIC_LINK_LIFETIME: number = 3600; // in seconds (1 Hour)
