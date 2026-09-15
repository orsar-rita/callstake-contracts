import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config as loadDotenv } from 'dotenv';
import { validateEnv } from '../config/env.schema';

loadDotenv();
const env = validateEnv(process.env);

/**
 * Standalone TypeORM DataSource for the CLI (`typeorm migration:generate`,
 * `migration:run`). Nest's own DI-driven TypeOrmModule (database.module.ts)
 * is used at runtime; this file exists only because the TypeORM CLI needs a
 * plain DataSource it can import without booting the whole Nest app.
 */
export default new DataSource({
  type: 'postgres',
  host: env.DATABASE_HOST,
  port: env.DATABASE_PORT,
  username: env.DATABASE_USER,
  password: env.DATABASE_PASSWORD,
  database: env.DATABASE_NAME,
  ssl: env.DATABASE_SSL ? { rejectUnauthorized: false } : false,
  entities: [__dirname + '/../**/*.entity.{js,ts}'],
  migrations: [__dirname + '/migrations/*.{js,ts}'],
});
