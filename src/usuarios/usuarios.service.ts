import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import * as bcrypt from 'bcryptjs'

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.usuario.findUnique({ where: { email } });
  }

  async findById(id: string) {
    return this.prisma.usuario.findUnique({ where: { id } });
  }

  async findAll() {
    return this.prisma.usuario.findMany({
      select: { id: true, email: true, nombre: true, rol: true, activo: true, creadoEn: true },
      orderBy: { creadoEn: 'desc' },
    });
  }

  async create(dto: CreateUsuarioDto) {
    const existe = await this.findByEmail(dto.email);
    if (existe) throw new ConflictException('El email ya está registrado');

    const hash = await bcrypt.hash(dto.password, 12);
    const usuario = await this.prisma.usuario.create({
      data: { ...dto, password: hash },
    });
    const { password: _p, ...result } = usuario;
    return result;
  }

  async toggleActivo(id: string) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    return this.prisma.usuario.update({
      where: { id },
      data: { activo: !usuario.activo },
      select: { id: true, email: true, nombre: true, rol: true, activo: true },
    });
  }
}
