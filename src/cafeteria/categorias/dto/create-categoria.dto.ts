import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateCategoriaDto {
  @IsString()
  nombre: string;

  @IsString()
  @IsOptional()
  emoji?: string;

  @IsNumber()
  @IsOptional()
  orden?: number;

  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}
