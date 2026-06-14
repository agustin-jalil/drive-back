import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';

export enum Rol {
  ADMIN = 'ADMIN',
  MOZO = 'MOZO',
  BARISTA = 'BARISTA',
  LUBRICENTRO = 'LUBRICENTRO',
}

export class CreateUsuarioDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  nombre: string;

  @IsEnum(Rol)
  rol: Rol;
}
