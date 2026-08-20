import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Worker } from './type';

// Workers only ever hit REST controllers, so this reads the request directly.
export const CurrentWorker = createParamDecorator(
  (_data: unknown, context: ExecutionContext): Worker | undefined =>
    context.switchToHttp().getRequest<{ worker?: Worker }>().worker,
);
