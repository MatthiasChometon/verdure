import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { GlobalExceptionFilter } from './exception.filter';

// Declared as a provider rather than through app.useGlobalFilters() because it
// needs the HTTP adapter injected, and so the e2e suites, which build the
// module themselves, get the same filter as production.
@Module({
  providers: [{ provide: APP_FILTER, useClass: GlobalExceptionFilter }],
})
export class ErrorsInfrastructureModule {}
