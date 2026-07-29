import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';

export interface EnvelopedResponse<T> {
  data: T;
  meta: {
    timestamp: string;
  };
}

// Wraps every successful response in a consistent envelope so the frontend's
// API client (apps/web/lib/api-client) can rely on one shape everywhere,
// instead of each endpoint returning a differently-structured payload.
@Injectable()
export class TransformResponseInterceptor<T> implements NestInterceptor<T, EnvelopedResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<EnvelopedResponse<T>> {
    return next.handle().pipe(
      map((data) => ({
        data,
        meta: { timestamp: new Date().toISOString() },
      })),
    );
  }
}
