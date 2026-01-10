import { DataSource } from 'typeorm';
import { resolve } from 'path';
import { config } from 'dotenv';

config({
  path: resolve(`.env.${process.env.NODE_ENV || 'development'}.local`),
});

const isProduction = process.env.NODE_ENV === 'production';

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: isProduction ? { rejectUnauthorized: false } : false,
  entities: [__dirname + '/entities/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  migrationsRun: isProduction,
  synchronize: !isProduction,
  logging: !isProduction,
});

export default AppDataSource;
