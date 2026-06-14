#!/bin/bash
set -e

echo "==> Actualizando Prisma a v7.8.0 (client, cli, adapter-pg)"

pnpm remove @prisma/client @prisma/adapter-pg prisma
pnpm add @prisma/client@7.8.0 @prisma/adapter-pg@7.8.0
pnpm add -D prisma@7.8.0

echo "==> Regenerando cliente"
pnpm prisma generate

echo "==> Listo. Revisá los archivos editados manualmente abajo."