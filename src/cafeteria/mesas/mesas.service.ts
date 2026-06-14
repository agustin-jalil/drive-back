import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MesasService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.mesa.findMany({
      where: { activo: true },
      orderBy: [{ tipo: 'asc' }, { numero: 'asc' }],
      include: {
        pedidos: {
          where: { estado: { not: 'CERRADO' } },
          select: { id: true, estado: true, total: true, numero: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const mesa = await this.prisma.mesa.findUnique({
      where: { id },
      include: {
        pedidos: {
          where: { estado: { not: 'CERRADO' } },
          include: { items: { include: { item: true } } },
        },
      },
    });
    if (!mesa) throw new NotFoundException('Mesa no encontrada');
    return mesa;
  }
}
