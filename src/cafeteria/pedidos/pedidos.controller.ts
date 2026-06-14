import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { PedidosService } from './pedidos.service';
import { CreatePedidoDto } from './dto/create-pedido.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('cafeteria/pedidos')
export class PedidosController {
  constructor(private readonly pedidosService: PedidosService) {}

  @Get()
  findAll(@Query('estado') estado?: string) {
    return this.pedidosService.findAll(estado);
  }

  @Get('historial')
  historialHoy() {
    return this.pedidosService.findHistorialHoy();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.pedidosService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreatePedidoDto, @Request() req: any) {
    return this.pedidosService.create(dto, req.user.sub);
  }

  @Patch(':id/avanzar')
  avanzarEstado(@Param('id') id: string) {
    return this.pedidosService.avanzarEstado(id);
  }

  @Patch(':id/cerrar')
  cerrar(@Param('id') id: string) {
    return this.pedidosService.cerrar(id);
  }
}
