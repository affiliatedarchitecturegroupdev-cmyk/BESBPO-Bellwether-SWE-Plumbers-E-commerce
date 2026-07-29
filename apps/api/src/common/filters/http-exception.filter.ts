import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { Sentry } from '../../instrument';

interface ErrorResponseBody {
  statusCode: number;
  path: string;
  timestamp: string;
  message: string | string[];
  error: string;
}

// Prisma error codes worth a specific, clean HTTP response rather than a
// generic 500 — see https://www.prisma.io/docs/orm/reference/error-reference
// for the full list. This is deliberately a backstop, not a replacement for
// the explicit guards already in services like ProductsService.remove() —
// those give a specific, contextual message ("cannot delete a product
// still referenced by a bundle..."); this filter is what catches it if a
// *future* module (very plausibly one OpenHands writes) forgets to add the
// equivalent guard. Belt and suspenders, not either/or.
const PRISMA_STATUS_MAP: Record<string, { status: number; message: string }> = {
  P2002: { status: HttpStatus.CONFLICT, message: 'A record with this value already exists.' },
  P2003: { status: HttpStatus.CONFLICT, message: 'This action is blocked by a related record elsewhere.' },
  P2025: { status: HttpStatus.NOT_FOUND, message: 'The requested record was not found.' },
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, message, errorName, shouldLogStack } = this.resolve(exception);

    const body: ErrorResponseBody = {
      statusCode: status,
      path: request.url,
      timestamp: new Date().toISOString(),
      message,
      error: errorName,
    };

    if (shouldLogStack) {
      // Unexpected errors get logged with the stack; validation/HTTP errors
      // (4xx) are expected traffic and shouldn't spam error-level logs.
      this.logger.error(exception instanceof Error ? exception.stack : exception);
      // Same signal, same reasoning — only genuinely unexpected failures
      // are worth alerting on. Sentry.captureException is a safe no-op
      // when SENTRY_DSN isn't configured (see instrument.ts).
      Sentry.captureException(exception);
    }

    response.status(status).json(body);
  }

  private resolve(exception: unknown): {
    status: number;
    message: string | string[];
    errorName: string;
    shouldLogStack: boolean;
  } {
    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();
      const message =
        typeof exceptionResponse === 'object' && exceptionResponse !== null && 'message' in exceptionResponse
          ? (exceptionResponse as { message: string | string[] }).message
          : exception.message;
      return { status: exception.getStatus(), message, errorName: exception.name, shouldLogStack: false };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const mapped = PRISMA_STATUS_MAP[exception.code];
      if (mapped) {
        // Known, expected-shape database error (unique/FK/not-found) — not a
        // bug worth an error-level log entry, same reasoning as 4xx above.
        return { status: mapped.status, message: mapped.message, errorName: 'DatabaseConstraintError', shouldLogStack: false };
      }
      // An unmapped Prisma error code is genuinely unexpected — fall through
      // to the generic 500 path below, stack and all.
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      errorName: 'InternalServerError',
      shouldLogStack: true,
    };
  }
}
