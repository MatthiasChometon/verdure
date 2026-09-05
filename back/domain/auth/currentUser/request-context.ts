import { ExecutionContext } from '@nestjs/common';
import { GqlContextType, GqlExecutionContext } from '@nestjs/graphql';
import { AuthenticatedRequest } from './type';

// Shared by the guard and @CurrentUser: resolves the Fastify request the same
// way from GraphQL resolvers and REST controllers alike.
export class RequestContext {
  static from(context: ExecutionContext): AuthenticatedRequest {
    return context.getType<GqlContextType>() === 'graphql'
      ? GqlExecutionContext.create(context).getContext<{
          req: AuthenticatedRequest;
        }>().req
      : context.switchToHttp().getRequest<AuthenticatedRequest>();
  }
}
