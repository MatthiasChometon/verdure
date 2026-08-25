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
        autoSchemaFile: join(process.cwd(), 'infrastructure/graphql/schema.gql'),
        sortSchema: true,
        // Off unless explicitly asked for. The whole schema is a map of the
        // attack surface, and a deployment has no reason to hand it out. The
        // front's type generation still introspects — it points GQL_HOST at a
        // back that has this on (dev, or a build-time instance), and the
        // committed schema is the fallback so the deployed API can stay dark.
        introspection: config.get<string>('GRAPHQL_INTROSPECTION') === 'true',
      }),
    }),
  ],
})
export class GraphqlInfrastructureModule {}
