import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePedidoDto } from './dto/create-pedido.dto';
import { EstadoPedido } from '@prisma/client';

const FLUJO_ESTADOS: Record<string, EstadoPedido> = {
  PENDIENTE:      'EN_PREPARACION',
  EN_PREPARACION: 'LISTO',
  LISTO:          'ENTREGADO',
};

const includeCompleto = {
  mesa: true,
  items: { include: { item: true } },
  usuario: { select: { id: true, nombre: true } },
} as const;

@Injectable()
export class PedidosService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(estado?: string) {
    return this.prisma.pedido.findMany({
      where: {
        ...(estado ? { estado: estado as EstadoPedido } : { estado: { not: 'CERRADO' } }),
      },
      include: includeCompleto,
      orderBy: { creadoEn: 'desc' },
    });
  }

  // Pedidos CERRADOS del día de hoy
  findHistorialHoy() {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const maniana = new Date(hoy);
    maniana.setDate(maniana.getDate() + 1);

    return this.prisma.pedido.findMany({
      where: {
        estado: 'CERRADO',
        cerradoEn: { gte: hoy, lt: maniana },
      },
      include: includeCompleto,
      orderBy: { cerradoEn: 'desc' },
    });
  }

  async findOne(id: string) {
    const pedido = await this.prisma.pedido.findUnique({
      where: { id },
      include: includeCompleto,
    });
    if (!pedido) throw new NotFoundException('Pedido no encontrado');
    return pedido;
  }

  async create(dto: CreatePedidoDto, usuarioId: string) {
    const itemsIds = dto.items.map((i) => i.itemId);
    const itemsCatalogo = await this.prisma.itemCatalogo.findMany({
      where: { id: { in: itemsIds }, activo: true },
    });

    if (itemsCatalogo.length !== itemsIds.length) {
      throw new BadRequestException('Uno o más items no existen o están inactivos');
    }

    const total = dto.items.reduce((acc, curr) => {
      const item = itemsCatalogo.find((i) => i.id === curr.itemId)!;
      return acc + item.precio * curr.cantidad;
    }, 0);

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const count = await this.prisma.pedido.count({ where: { creadoEn: { gte: hoy } } });

    return this.prisma.pedido.create({
      data: {
        numero: count + 1,
        mesaId: dto.mesaId,
        usuarioId,
        total,
        items: {
          create: dto.items.map((i) => {
            const item = itemsCatalogo.find((c) => c.id === i.itemId)!;
            return {
              itemId: i.itemId,
              cantidad: i.cantidad,
              precioUnit: item.precio,
              subtotal: item.precio * i.cantidad,
            };
          }),
        },
      },
      include: { mesa: true, items: { include: { item: true } } },
    });
  }

  async avanzarEstado(id: string) {
    const pedido = await this.findOne(id);
    const siguiente = FLUJO_ESTADOS[pedido.estado];
    if (!siguiente) throw new BadRequestException(`No se puede avanzar desde ${pedido.estado}`);

    return this.prisma.pedido.update({
      where: { id },
      data: { estado: siguiente },
      include: { mesa: true, items: { include: { item: true } } },
    });
  }

  async cerrar(id: string) {
    const pedido = await this.findOne(id);
    if (pedido.estado !== 'ENTREGADO') {
      throw new BadRequestException('Solo se pueden cerrar pedidos entregados');
    }
    return this.prisma.pedido.update({
      where: { id },
      data: { estado: 'CERRADO', cerradoEn: new Date() },
      include: { mesa: true, items: { include: { item: true } } },
    });
  }
}
