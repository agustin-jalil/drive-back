import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { CategoriasModule } from './cafeteria/categorias/categorias.module';
import { CatalogoModule } from './cafeteria/catalogo/catalogo.module';
import { MesasModule } from './cafeteria/mesas/mesas.module';
import { PedidosModule } from './cafeteria/pedidos/pedidos.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsuariosModule,
    CategoriasModule,
    CatalogoModule,
    MesasModule,
    PedidosModule,
  ],
})
export class AppModule {}
