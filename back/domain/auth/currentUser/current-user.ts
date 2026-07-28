import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { User } from '../../user/model';
import { RequestContext } from './request-context';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): User | undefined =>
    RequestContext.from(context).user,
);
