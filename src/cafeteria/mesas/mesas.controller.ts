import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { MesasService } from './mesas.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('cafeteria/mesas')
export class MesasController {
  constructor(private readonly mesasService: MesasService) {}

  @Get()
  findAll() {
    return this.mesasService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.mesasService.findOne(id);
  }
}
