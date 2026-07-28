import { ExecutionContext } from '@nestjs/common';
import { GqlContextType, GqlExecutionContext } from '@nestjs/graphql';
import { AuthenticatedRequest } from './type';

// The auth cookie and the resolved user both live on the Fastify request in
// every transport, so the guard and @CurrentUser share one accessor that
// resolves the request from GraphQL resolvers and REST controllers alike.
export class RequestContext {
  static from(context: ExecutionContext): AuthenticatedRequest {
    return context.getType<GqlContextType>() === 'graphql'
      ? GqlExecutionContext.create(context).getContext<{
          req: AuthenticatedRequest;
        }>().req
      : context.switchToHttp().getRequest<AuthenticatedRequest>();
  }
}
