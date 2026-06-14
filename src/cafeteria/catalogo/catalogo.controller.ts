import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { CatalogoService } from './catalogo.service';
import { CreateItemDto } from './dto/create-item.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('cafeteria/catalogo')
export class CatalogoController {
  constructor(private readonly catalogoService: CatalogoService) {}

  @Get()
  findAll(@Query('categoriaId') categoriaId?: string) {
    return this.catalogoService.findAll(categoriaId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.catalogoService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateItemDto) {
    return this.catalogoService.create(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: CreateItemDto) {
    return this.catalogoService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.catalogoService.remove(id);
  }
}
