import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateItemDto } from './dto/create-item.dto';

@Injectable()
export class CatalogoService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(categoriaId?: string) {
    return this.prisma.itemCatalogo.findMany({
      where: {
        activo: true,
        ...(categoriaId ? { categoriaId } : {}),
      },
      include: { categoria: true },
      orderBy: [{ categoria: { orden: 'asc' } }, { nombre: 'asc' }],
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.itemCatalogo.findUnique({
      where: { id },
      include: { categoria: true },
    });
    if (!item) throw new NotFoundException('Item no encontrado');
    return item;
  }

  create(dto: CreateItemDto) {
    return this.prisma.itemCatalogo.create({
      data: dto,
      include: { categoria: true },
    });
  }

  async update(id: string, dto: Partial<CreateItemDto>) {
    await this.findOne(id);
    return this.prisma.itemCatalogo.update({
      where: { id },
      data: dto,
      include: { categoria: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.itemCatalogo.update({ where: { id }, data: { activo: false } });
  }
}
