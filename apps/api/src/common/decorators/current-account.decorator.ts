import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

// Populated by KeycloakJwtStrategy.validate() and attached to req.user by
// Passport. Usage: findMyOrders(@CurrentAccount() account: AuthenticatedAccount)
export interface AuthenticatedAccount {
  keycloakSub: string;
  email: string;
  scopes: string[];
}

export const CurrentAccount = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedAccount => {
    const request = ctx.switchToHttp().getRequest<Request & { user: AuthenticatedAccount }>();
    return request.user;
  },
);
