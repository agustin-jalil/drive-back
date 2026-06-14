import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsString, Min, ValidateNested } from 'class-validator';

class ItemPedidoDto {
  @IsString()
  itemId: string;

  @IsNumber()
  @Min(1)
  cantidad: number;
}

export class CreatePedidoDto {
  @IsString()
  mesaId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemPedidoDto)
  items: ItemPedidoDto[];
}
