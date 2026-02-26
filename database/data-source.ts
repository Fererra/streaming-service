import { DataSource } from 'typeorm';
import { resolve } from 'path';
import { config } from 'dotenv';

config({
  path: resolve(`.env.${process.env.NODE_ENV || 'development'}.local`),
});

const env = process.env.NODE_ENV || 'development';

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: env === 'production' ? { rejectUnauthorized: false } : false,
  entities: [
    __dirname + '/../apps/**/*.entity{.ts,.js}',
    __dirname + '/../libs/**/*.entity{.ts,.js}',
  ],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
});

export default AppDataSource;
