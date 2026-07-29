import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { KeycloakJwtStrategy } from './keycloak-jwt.strategy';

@Module({
  imports: [PassportModule],
  providers: [KeycloakJwtStrategy],
  exports: [PassportModule],
})
export class AuthModule {}
