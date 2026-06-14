// prisma/seed.ts
// Copiá este archivo en prisma/seed.ts

import { PrismaClient, Rol, TipoMesa } from '@prisma/client';
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  // ── Usuario Admin ────────────────────────────────────────
  const hash = await bcrypt.hash('admin@drive.com', 12);

  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@drive.com' },
    update: {},
    create: {
      email: 'admin@drive.com',
      password: hash,
      nombre: 'Administrador DRIVE',
      rol: Rol.ADMIN,
      activo: true,
    },
  });
  console.log(`✓ Usuario admin: ${admin.email}`);

  // ── Usuario Mozo demo ────────────────────────────────────
  const hashMozo = await bcrypt.hash('mozo1234', 12);
  await prisma.usuario.upsert({
    where: { email: 'mozo@drive.com' },
    update: {},
    create: {
      email: 'mozo@drive.com',
      password: hashMozo,
      nombre: 'Mozo Demo',
      rol: Rol.MOZO,
      activo: true,
    },
  });
  console.log('✓ Usuario mozo: mozo@drive.com / mozo1234');

  // ── Categorías ───────────────────────────────────────────
  const categorias = [
    { nombre: 'Cafés',      emoji: '☕', orden: 1 },
    { nombre: 'Infusiones', emoji: '🍵', orden: 2 },
    { nombre: 'Fríos',      emoji: '🧊', orden: 3 },
    { nombre: 'Comidas',    emoji: '🥐', orden: 4 },
    { nombre: 'Postres',    emoji: '🍰', orden: 5 },
  ];

  const categoriasCreadas: Record<string, string> = {};

  for (const cat of categorias) {
    const existe = await prisma.categoria.findFirst({ where: { nombre: cat.nombre } });
    if (!existe) {
      const c = await prisma.categoria.create({ data: cat });
      categoriasCreadas[cat.nombre] = c.id;
      console.log(`  ✓ Categoría: ${cat.emoji} ${cat.nombre}`);
    } else {
      categoriasCreadas[cat.nombre] = existe.id;
      console.log(`  ~ Categoría ya existe: ${cat.nombre}`);
    }
  }

  // ── Items del Catálogo ───────────────────────────────────
  const items = [
    // Cafés
    { nombre: 'Espresso',       emoji: '☕', precio: 800,  categoria: 'Cafés' },
    { nombre: 'Americano',      emoji: '☕', precio: 900,  categoria: 'Cafés' },
    { nombre: 'Latte',          emoji: '🥛', precio: 1200, categoria: 'Cafés' },
    { nombre: 'Cappuccino',     emoji: '☕', precio: 1100, categoria: 'Cafés' },
    { nombre: 'Cortado',        emoji: '☕', precio: 850,  categoria: 'Cafés' },
    // Infusiones
    { nombre: 'Té Verde',       emoji: '🍵', precio: 700,  categoria: 'Infusiones' },
    { nombre: 'Manzanilla',     emoji: '🌼', precio: 650,  categoria: 'Infusiones' },
    { nombre: 'Jengibre Limón', emoji: '🍋', precio: 750,  categoria: 'Infusiones' },
    // Fríos
    { nombre: 'Frappé',         emoji: '🧋', precio: 1500, categoria: 'Fríos' },
    { nombre: 'Cold Brew',      emoji: '🧊', precio: 1400, categoria: 'Fríos' },
    { nombre: 'Limonada',       emoji: '🍋', precio: 1000, categoria: 'Fríos' },
    // Comidas
    { nombre: 'Medialunas x3',  emoji: '🥐', precio: 900,  categoria: 'Comidas' },
    { nombre: 'Tostado Mixto',  emoji: '🥪', precio: 1400, categoria: 'Comidas' },
    { nombre: 'Avocado Toast',  emoji: '🥑', precio: 1800, categoria: 'Comidas' },
    // Postres
    { nombre: 'Brownie',        emoji: '🍫', precio: 1100, categoria: 'Postres' },
    { nombre: 'Cheesecake',     emoji: '🍰', precio: 1600, categoria: 'Postres' },
  ];

  for (const item of items) {
    const existe = await prisma.itemCatalogo.findFirst({
      where: { nombre: item.nombre, categoriaId: categoriasCreadas[item.categoria] },
    });
    if (!existe) {
      await prisma.itemCatalogo.create({
        data: {
          nombre: item.nombre,
          emoji: item.emoji,
          precio: item.precio,
          categoriaId: categoriasCreadas[item.categoria],
          activo: true,
        },
      });
      console.log(`  ✓ Item: ${item.emoji} ${item.nombre} — $${item.precio}`);
    } else {
      console.log(`  ~ Item ya existe: ${item.nombre}`);
    }
  }

  // ── Mesas ────────────────────────────────────────────────
  const mesasData = [
    ...Array.from({ length: 6 }, (_, i) => ({
      numero: i + 1,
      label: `Mesa ${i + 1}`,
      tipo: TipoMesa.MESA,
    })),
    ...Array.from({ length: 6 }, (_, i) => ({
      numero: i + 1,
      label: `Barra ${i + 1}`,
      tipo: TipoMesa.BARRA,
    })),
  ];

  for (const mesa of mesasData) {
    const existe = await prisma.mesa.findFirst({
      where: { numero: mesa.numero, tipo: mesa.tipo },
    });
    if (!existe) {
      await prisma.mesa.create({ data: mesa });
      console.log(`  ✓ ${mesa.label}`);
    } else {
      console.log(`  ~ ${mesa.label} ya existe`);
    }
  }

  console.log('');
  console.log('🎉 Seed completado!');
  console.log('');
  console.log('  Admin:  admin@drive.com / admin@drive.com');
  console.log('  Mozo:   mozo@drive.com  / mozo1234');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });