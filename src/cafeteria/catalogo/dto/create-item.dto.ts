import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateItemDto {
  @IsString()
  nombre: string;

  @IsString()
  @IsOptional()
  emoji?: string;

  @IsNumber()
  precio: number;

  @IsString()
  categoriaId: string;

  @IsBoolean()
  @IsOptional()
  activo?: boolean;

  @IsString()
  @IsOptional()
  descripcion?: string;
}
