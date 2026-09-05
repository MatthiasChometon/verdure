import { join } from 'node:path';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';

@Module({
  imports: [
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        autoSchemaFile: join(
          process.cwd(),
          'infrastructure/graphql/schema.gql',
        ),
        sortSchema: true,
        // Off unless explicitly asked for (a deployed API shouldn't map its own
        // attack surface); front codegen introspects a dev/build instance instead.
        introspection: config.get<string>('GRAPHQL_INTROSPECTION') === 'true',
      }),
    }),
  ],
})
export class GraphqlInfrastructureModule {}
