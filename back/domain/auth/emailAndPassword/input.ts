import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  MinLength,
} from 'class-validator';

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;
const NAME_MAX_LENGTH = 100;

export const LOCALES = ['fr', 'en'] as const;

export class RegisterInput {
  @IsEmail()
  email: string;

  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  password: string;

  @IsNotEmpty()
  @MaxLength(NAME_MAX_LENGTH)
  name: string;

  @IsOptional()
  @IsIn(LOCALES)
  locale?: string;
}

export class LoginInput {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  password: string;
}

export class EmailInput {
  @IsEmail()
  email: string;
}

export class TokenInput {
  @IsNotEmpty()
  token: string;
}

export class ResetPasswordInput {
  @IsNotEmpty()
  token: string;

  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  password: string;
}
