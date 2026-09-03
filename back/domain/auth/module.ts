import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { UserModule } from '../user/module';
import { SessionCookie } from './currentUser/cookie';
import { LogoutController } from './currentUser/controller';
import { AuthGuard } from './currentUser/guard';
import { EmailPasswordController } from './emailAndPassword/controller';
import { EmailRenderer } from './emailAndPassword/email-renderer';
import { PasswordService } from './emailAndPassword/password.service';
import { AuthTokenRepository } from './emailAndPassword/token-repository';
import { GoogleController } from './google/controller';
import { GoogleOAuth } from './google/service';
import { AuthResolver } from './resolver';
import { AuthService } from './service';

@Module({
  imports: [
    UserModule,
    HttpModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService): JwtModuleOptions => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [EmailPasswordController, GoogleController, LogoutController],
  providers: [
    GoogleOAuth,
    PasswordService,
    AuthTokenRepository,
    EmailRenderer,
    AuthService,
    AuthResolver,
    AuthGuard,
    SessionCookie,
  ],
  exports: [AuthService, AuthGuard, SessionCookie],
})
export class AuthModule {}
