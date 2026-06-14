import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, TipoMesa, Rol } from '@prisma/client';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Iniciando seed...');

  // ── Limpiar datos de cafetería ──
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
      { nombre: 'Combo Tradicional',  emoji: '🥐', descripcion: 'Infusión + dos medialunas o tortillas + jugo de naranja',                                               precio: 6000,  categoriaId: combos.id, activo: true },
      { nombre: 'Combo Simple',       emoji: '🍞', descripcion: 'Infusión + dos tostadas con mermelada y queso + jugo de naranja',                                       precio: 7000,  categoriaId: combos.id, activo: true },
      { nombre: 'Avocado Toast',      emoji: '🥑', descripcion: 'Infusión + dos tostadas con palta, huevo revuelto, tomates cherry y mix de semillas + jugo de naranja', precio: 11000, categoriaId: combos.id, activo: true },
      { nombre: 'Carlitos & Licuado', emoji: '🥪', descripcion: 'Licuado a elección + carlitos de jamón y queso + papas chip',                                           precio: 9000,  categoriaId: combos.id, activo: true },
    ],
  });

  // ── Items: INFUSIONES ──
  await prisma.itemCatalogo.createMany({
    data: [
      { nombre: 'Té',         emoji: '🍵', descripcion: 'Negro clásico / verde tradicional / tilo / hierbas digestivas',                        precio: 2300, categoriaId: infusiones.id, activo: true },
      { nombre: 'Mate cocido',emoji: '🧉', descripcion: 'Mate cocido tradicional',                                                               precio: 2300, categoriaId: infusiones.id, activo: true },
      { nombre: 'Submarino',  emoji: '🍫', descripcion: 'Leche caliente texturizada con una barra de chocolate premium para derretir',           precio: 4500, categoriaId: infusiones.id, activo: true },
    ],
  });

  // ── Items: CAFETERÍA ──
  await prisma.itemCatalogo.createMany({
    data: [
      { nombre: 'Ristretto',      emoji: '☕', descripcion: 'Shot de espresso corto y concentrado',                                                     precio: 3100, categoriaId: cafeteria.id, activo: true },
      { nombre: 'Espresso',       emoji: '☕', descripcion: 'Clásico shot de café negro y equilibrado',                                                 precio: 3100, categoriaId: cafeteria.id, activo: true },
      { nombre: 'Macchiato',      emoji: '☕', descripcion: 'Espresso clásico con una sutil cucharada de espuma de leche caliente',                     precio: 3300, categoriaId: cafeteria.id, activo: true },
      { nombre: 'Café',           emoji: '☕', descripcion: 'Clásico café negro en una medida intermedia',                                              precio: 3600, categoriaId: cafeteria.id, activo: true },
      { nombre: 'Café doble',     emoji: '☕', descripcion: 'Dos shots de espresso perfectos en una sola taza',                                         precio: 4000, categoriaId: cafeteria.id, activo: true },
      { nombre: 'Cortado',        emoji: '☕', descripcion: 'Espresso equilibrado con una pequeña cantidad de leche caliente',                          precio: 3800, categoriaId: cafeteria.id, activo: true },
      { nombre: 'Café con leche', emoji: '🥛', descripcion: 'Mitad espresso y mitad leche vaporizada',                                                 precio: 4000, categoriaId: cafeteria.id, activo: true },
      { nombre: 'Lágrima',        emoji: '🥛', descripcion: 'Leche caliente con unas gotas de café, suave y delicado',                                 precio: 4000, categoriaId: cafeteria.id, activo: true },
      { nombre: 'Flat White',     emoji: '☕', descripcion: 'Doble shot de espresso con leche al vapor texturizada',                                    precio: 4300, categoriaId: cafeteria.id, activo: true },
      { nombre: 'Americano',      emoji: '☕', descripcion: 'Espresso diluido en agua caliente',                                                        precio: 4000, categoriaId: cafeteria.id, activo: true },
      { nombre: 'Moka',           emoji: '🍫', descripcion: 'Espresso, chocolate y leche vaporizada con espuma',                                       precio: 4000, categoriaId: cafeteria.id, activo: true },
      { nombre: 'Latte',          emoji: '☕', descripcion: 'Espresso con leche texturizada y almíbar de vainilla o caramelo',                          precio: 4000, categoriaId: cafeteria.id, activo: true },
    ],
  });

  // ── Mesas (solo si no existen) ──
  const mesasExistentes = await prisma.mesa.count();
  if (mesasExistentes === 0) {
    console.log('🪑 Creando mesas...');
    for (let i = 1; i <= 8; i++) {
      await prisma.mesa.create({ data: { numero: i, label: `Mesa ${i}`, tipo: TipoMesa.MESA, activo: true } });
    }
    for (let i = 1; i <= 3; i++) {
      await prisma.mesa.create({ data: { numero: i, label: `Barra ${i}`, tipo: TipoMesa.BARRA, activo: true } });
    }
  } else {
    console.log(`🪑 Ya existen ${mesasExistentes} mesas, se omiten`);
  }

  // ── Usuario admin (si no existe) ──
  const adminExistente = await prisma.usuario.findUnique({ where: { email: 'admin@drive.com' } });
  if (!adminExistente) {
    const hash = await bcrypt.hash('admin@drive.com', 12);
    await prisma.usuario.create({
      data: { email: 'admin@drive.com', password: hash, nombre: 'Administrador', rol: Rol.ADMIN, activo: true },
    });
    console.log('👤 Usuario admin creado: admin@drive.com / admin@drive.com');
  } else {
    console.log('👤 Admin ya existe, se omite');
  }

  const totalItems = await prisma.itemCatalogo.count();
  const totalCats  = await prisma.categoria.count();
  console.log(`✅ Seed completo: ${totalCats} categorías, ${totalItems} items`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });