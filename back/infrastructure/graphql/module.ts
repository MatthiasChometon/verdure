import { join } from 'node:path';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import depthLimit from 'graphql-depth-limit';

// The front's deepest query is 4 levels; introspection fields are not counted.
const MAX_QUERY_DEPTH = 10;

@Module({
  imports: [
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): ApolloDriverConfig => ({
        autoSchemaFile: join(
          process.cwd(),
          'infrastructure/graphql/schema.gql',
        ),
        sortSchema: true,
        // Off unless explicitly asked for (a deployed API shouldn't map its own
        // attack surface); front codegen introspects a dev/build instance instead.
        introspection: config.get<string>('GRAPHQL_INTROSPECTION') === 'true',
        playground: false,
        includeStacktraceInErrorResponses: false,
        // No automatic persisted queries: their cache is unbounded by default.
        persistedQueries: false,
        validationRules: [depthLimit(MAX_QUERY_DEPTH)],
      }),
    }),
  ],
})
export class GraphqlInfrastructureModule {}
