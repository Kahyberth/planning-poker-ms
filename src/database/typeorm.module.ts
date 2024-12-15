import { DataSource } from 'typeorm';
import { Global, Module } from '@nestjs/common';
import { envs } from 'src/commons/envs';

@Global()
@Module({
  imports: [],
  providers: [
    {
      provide: DataSource,
      inject: [],
      useFactory: async () => {
        try {
          const dataSource = new DataSource({
            type: 'postgres',
            host: envs.DB_HOST,
            port: envs.DB_PORT,
            username: envs.DB_USERNAME,
            password: envs.DB_PASSWORD,
            database: envs.DB_DATABASE,
            synchronize: true,
            entities: [`${__dirname}/../**/**.entity{.ts,.js}`],
            extra: {
              max: 5,
            },
          });
          await dataSource.initialize();
          console.log('Database connected successfully');
          return dataSource;
        } catch (error) {
          console.log('Error connecting to database');
          throw error;
        }
      },
    },
  ],
  exports: [DataSource],
})
export class TypeOrmModule {}
