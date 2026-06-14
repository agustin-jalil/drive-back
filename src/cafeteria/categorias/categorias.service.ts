import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoriaDto } from './dto/create-categoria.dto';

@Injectable()
export class CategoriasService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.categoria.findMany({
      where: { activo: true },
      orderBy: { orden: 'asc' },
      include: { _count: { select: { items: true } } },
    });
  }

  async findOne(id: string) {
    const cat = await this.prisma.categoria.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('Categoría no encontrada');
    return cat;
  }

  create(dto: CreateCategoriaDto) {
    return this.prisma.categoria.create({ data: dto });
  }

  async update(id: string, dto: Partial<CreateCategoriaDto>) {
    await this.findOne(id);
    return this.prisma.categoria.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.categoria.update({ where: { id }, data: { activo: false } });
  }
}
