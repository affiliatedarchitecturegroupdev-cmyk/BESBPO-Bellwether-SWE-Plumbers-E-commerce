import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import * as jwksRsa from 'jwks-rsa';
import { AuthenticatedAccount } from '../../common/decorators/current-account.decorator';

// Enriched JWT claim shape issued by the group's central Keycloak instance —
// scope_keys carries the scope-key authorization pattern used across all
// Besbpo Group divisions' services, not just this one.
interface BesbpoIdJwtPayload {
  sub: string;
  email: string;
  scope_keys?: string[];
}

@Injectable()
export class KeycloakJwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      audience: config.get<string>('KEYCLOAK_AUDIENCE'),
      issuer: config.get<string>('KEYCLOAK_ISSUER_URL'),
      algorithms: ['RS256'],
      secretOrKeyProvider: jwksRsa.passportJwtSecret({
        cache: true,
        cacheMaxAge: 3600000, // 1 hour — signing keys rotate infrequently
        rateLimit: true,
        jwksRequestsPerMinute: 10,
        jwksUri: config.get<string>('KEYCLOAK_JWKS_URI') as string,
      }),
    });
  }

  // Runs after signature/issuer/audience/expiry are already verified by
  // passport-jwt above — this just shapes what lands on req.user.
  validate(payload: BesbpoIdJwtPayload): AuthenticatedAccount {
    return {
      keycloakSub: payload.sub,
      email: payload.email,
      scopes: payload.scope_keys ?? [],
    };
  }
}
