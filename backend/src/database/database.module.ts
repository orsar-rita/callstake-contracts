import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.get<string>('database.host'),
        port: config.get<number>('database.port'),
        username: config.get<string>('database.username'),
        password: config.get<string>('database.password'),
        database: config.get<string>('database.database'),
        ssl: config.get<boolean>('database.ssl') ? { rejectUnauthorized: false } : false,
        autoLoadEntities: true,
        // Migrations are the source of truth for schema changes; never let
        // TypeORM synchronize the schema itself, even in development —
        // a drifted local schema silently masks migration bugs.
        synchronize: false,
        migrations: [__dirname + '/migrations/*.{js,ts}'],
        migrationsRun: config.get<string>('env') === 'production',
      }),
    }),
  ],
})
export class DatabaseModule {}
