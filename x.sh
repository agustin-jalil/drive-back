#!/usr/bin/env bash
# =============================================================================
# DRIVE Cafetería — BACKEND CHANGES
# Tareas: seed con menú real, endpoint GET pedidos?estado=CERRADO (ya existe),
#         endpoint resumen del día, campo cerradoEn (ya existe en schema)
# =============================================================================
set -e

echo "🚀 Aplicando cambios en el BACKEND..."

# ─────────────────────────────────────────────────────────────────────────────
# 1) Endpoint GET /cafeteria/pedidos/historial — pedidos CERRADOS del día
#    (El endpoint actual ya soporta ?estado=CERRADO pero no filtra por día)
#    Vamos a agregar un nuevo endpoint /historial que filtra por fecha
# ─────────────────────────────────────────────────────────────────────────────
echo "📄 Actualizando pedidos.service.ts para agregar findHistorialHoy..."
cat > src/cafeteria/pedidos/pedidos.service.ts << 'PEDSERVICE'
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
PEDSERVICE

echo "📄 Actualizando pedidos.controller.ts con /historial..."
cat > src/cafeteria/pedidos/pedidos.controller.ts << 'PEDCONTROLLER'
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
PEDCONTROLLER

# ─────────────────────────────────────────────────────────────────────────────
# 2) Seed con el menú real
# ─────────────────────────────────────────────────────────────────────────────
echo "📄 Creando prisma/seed.ts con el menú real..."
mkdir -p prisma

cat > prisma/seed.ts << 'SEED'
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  // ── Limpiar datos de cafetería (no usuarios ni mesas) ──
  await prisma.itemPedido.deleteMany();
  await prisma.pedido.deleteMany();
  await prisma.itemCatalogo.deleteMany();
  await prisma.categoria.deleteMany();

  // ── Categorías ──
  const combos = await prisma.categoria.create({
    data: { nombre: 'Combos', emoji: '🥐', orden: 1, activo: true },
  });
  const infusiones = await prisma.categoria.create({
    data: { nombre: 'Infusiones', emoji: '🍵', orden: 2, activo: true },
  });
  const cafeteria = await prisma.categoria.create({
    data: { nombre: 'Cafetería', emoji: '☕', orden: 3, activo: true },
  });

  // ── Items: COMBOS ──
  await prisma.itemCatalogo.createMany({
    data: [
      {
        nombre: 'Combo Tradicional',
        emoji: '🥐',
        descripcion: 'Infusión + dos medialunas o tortillas + jugo de naranja',
        precio: 6000,
        categoriaId: combos.id,
        activo: true,
      },
      {
        nombre: 'Combo Simple',
        emoji: '🍞',
        descripcion: 'Infusión + dos tostadas con mermelada y queso + jugo de naranja',
        precio: 7000,
        categoriaId: combos.id,
        activo: true,
      },
      {
        nombre: 'Avocado Toast',
        emoji: '🥑',
        descripcion: 'Infusión + dos tostadas con palta, huevo revuelto, tomates cherry y mix de semillas + jugo de naranja',
        precio: 11000,
        categoriaId: combos.id,
        activo: true,
      },
      {
        nombre: 'Carlitos & Licuado',
        emoji: '🥪',
        descripcion: 'Licuado a elección + tradicional carlitos de jamón y queso + papas chip',
        precio: 9000,
        categoriaId: combos.id,
        activo: true,
      },
    ],
  });

  // ── Items: INFUSIONES ──
  await prisma.itemCatalogo.createMany({
    data: [
      {
        nombre: 'Té',
        emoji: '🍵',
        descripcion: 'Negro clásico / verde tradicional / tilo / hierbas digestivas',
        precio: 2300,
        categoriaId: infusiones.id,
        activo: true,
      },
      {
        nombre: 'Mate cocido',
        emoji: '🧉',
        descripcion: 'Mate cocido tradicional',
        precio: 2300,
        categoriaId: infusiones.id,
        activo: true,
      },
      {
        nombre: 'Submarino',
        emoji: '🍫',
        descripcion: 'Leche caliente texturizada acompañada de una barra de chocolate premium para derretir',
        precio: 4500,
        categoriaId: infusiones.id,
        activo: true,
      },
    ],
  });

  // ── Items: CAFETERÍA ──
  await prisma.itemCatalogo.createMany({
    data: [
      {
        nombre: 'Ristretto',
        emoji: '☕',
        descripcion: 'Shot de espresso corto y concentrado',
        precio: 3100,
        categoriaId: cafeteria.id,
        activo: true,
      },
      {
        nombre: 'Espresso',
        emoji: '☕',
        descripcion: 'Clásico shot de café negro y equilibrado',
        precio: 3100,
        categoriaId: cafeteria.id,
        activo: true,
      },
      {
        nombre: 'Macchiato',
        emoji: '☕',
        descripcion: 'Espresso clásico con una sutil cucharada de espuma de leche caliente',
        precio: 3300,
        categoriaId: cafeteria.id,
        activo: true,
      },
      {
        nombre: 'Café',
        emoji: '☕',
        descripcion: 'Clásico café negro en una medida intermedia',
        precio: 3600,
        categoriaId: cafeteria.id,
        activo: true,
      },
      {
        nombre: 'Café doble',
        emoji: '☕',
        descripcion: 'Dos shots de espresso perfectos en una sola taza',
        precio: 4000,
        categoriaId: cafeteria.id,
        activo: true,
      },
      {
        nombre: 'Cortado',
        emoji: '☕',
        descripcion: 'Espresso equilibrado con una pequeña cantidad de leche caliente',
        precio: 3800,
        categoriaId: cafeteria.id,
        activo: true,
      },
      {
        nombre: 'Café con leche',
        emoji: '🥛',
        descripcion: 'Mitad espresso y mitad leche vaporizada',
        precio: 4000,
        categoriaId: cafeteria.id,
        activo: true,
      },
      {
        nombre: 'Lágrima',
        emoji: '🥛',
        descripcion: 'Leche caliente con unas gotas de café, suave y delicado',
        precio: 4000,
        categoriaId: cafeteria.id,
        activo: true,
      },
      {
        nombre: 'Flat White',
        emoji: '☕',
        descripcion: 'Doble shot de espresso con leche al vapor texturizada',
        precio: 4300,
        categoriaId: cafeteria.id,
        activo: true,
      },
      {
        nombre: 'Americano',
        emoji: '☕',
        descripcion: 'Espresso diluido en agua caliente',
        precio: 4000,
        categoriaId: cafeteria.id,
        activo: true,
      },
      {
        nombre: 'Moka',
        emoji: '🍫',
        descripcion: 'Espresso, chocolate y leche vaporizada con espuma',
        precio: 4000,
        categoriaId: cafeteria.id,
        activo: true,
      },
      {
        nombre: 'Latte',
        emoji: '☕',
        descripcion: 'Espresso combinado con leche texturizada y saborizado con almíbar de vainilla o caramelo',
        precio: 4000,
        categoriaId: cafeteria.id,
        activo: true,
      },
    ],
  });

  // ── Mesas (si no existen) ──
  const mesasExistentes = await prisma.mesa.count();
  if (mesasExistentes === 0) {
    console.log('🪑 Creando mesas...');
    const mesasDatos = [
      // Mesas salón
      ...Array.from({ length: 8 }, (_, i) => ({
        numero: i + 1,
        label: `Mesa ${i + 1}`,
        tipo: 'SALON' as const,
        activo: true,
      })),
      // Barra
      { numero: 1, label: 'Barra 1', tipo: 'BARRA' as const, activo: true },
      { numero: 2, label: 'Barra 2', tipo: 'BARRA' as const, activo: true },
      { numero: 3, label: 'Barra 3', tipo: 'BARRA' as const, activo: true },
      // Para llevar
      { numero: 1, label: 'Para llevar', tipo: 'PARA_LLEVAR' as const, activo: true },
    ];

    for (const mesa of mesasDatos) {
      await prisma.mesa.create({ data: mesa });
    }
  }

  // ── Usuario admin (si no existe) ──
  const adminExistente = await prisma.usuario.findUnique({ where: { email: 'admin@drive.com' } });
  if (!adminExistente) {
    const hash = await bcrypt.hash('admin123', 12);
    await prisma.usuario.create({
      data: {
        email: 'admin@drive.com',
        password: hash,
        nombre: 'Administrador',
        rol: 'ADMIN',
        activo: true,
      },
    });
    console.log('👤 Usuario admin creado: admin@drive.com / admin123');
  }

  const totalItems = await prisma.itemCatalogo.count();
  const totalCats  = await prisma.categoria.count();
  console.log(`✅ Seed completo: ${totalCats} categorías, ${totalItems} items en el menú`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
SEED

echo ""
echo "✅ BACKEND actualizado correctamente."
echo ""
echo "═══════════════════════════════════════════"
echo "📋 SCHEMA — COPIAR Y PEGAR MANUALMENTE"
echo "═══════════════════════════════════════════"
echo ""
echo "Verificá que tu prisma/schema.prisma tenga estos modelos."
echo "Si ya los tenés con estos campos, no necesitás migrar."
echo ""
echo "─── CAMPOS CLAVE A VERIFICAR EN Pedido ───"
echo ""
echo "model Pedido {"
echo "  id          String       @id @default(cuid())"
echo "  numero      Int"
echo "  estado      EstadoPedido @default(PENDIENTE)"
echo "  total       Float"
echo "  mesaId      String"
echo "  usuarioId   String"
echo "  creadoEn    DateTime     @default(now())"
echo "  cerradoEn   DateTime?    // <-- DEBE EXISTIR"
echo "  mesa        Mesa         @relation(fields: [mesaId], references: [id])"
echo "  usuario     Usuario      @relation(fields: [usuarioId], references: [id])"
echo "  items       ItemPedido[]"
echo "}"
echo ""
echo "─── SI cerradoEn NO EXISTE, ejecutar: ───"
echo ""
echo "  pnpm prisma migrate dev --name add_cerrado_en_pedido"
echo ""
echo "─── LUEGO CORRER EL SEED: ───"
echo ""
echo "  pnpm seed"
echo ""
echo "═══════════════════════════════════════════"
echo ""
echo "─────────────────────────────────────────────"
echo "📋 GIT:"
echo "─────────────────────────────────────────────"
echo ""
echo 'git add src/cafeteria/pedidos/pedidos.service.ts src/cafeteria/pedidos/pedidos.controller.ts prisma/seed.ts'
echo 'git commit -m "feat(cafeteria): historial pedidos del día, seed menú real Drive"'
echo 'git push'