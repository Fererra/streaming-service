import AppDataSource from '../../../database/data-source';

export default () => ({
  ...AppDataSource.options,
  autoLoadEntities: true,
  synchronize: process.env.NODE_ENV === 'development',
  migrationsRun: process.env.NODE_ENV === 'test',
});
