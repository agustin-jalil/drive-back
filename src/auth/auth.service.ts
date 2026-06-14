import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsuariosService } from '../usuarios/usuarios.service';
import * as bcrypt from 'bcryptjs'

@Injectable()
export class AuthService {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string) {
    const usuario = await this.usuariosService.findByEmail(email);
    if (!usuario) throw new UnauthorizedException('Credenciales inválidas');
    if (!usuario.activo) throw new UnauthorizedException('Usuario inactivo');

    const passwordOk = await bcrypt.compare(password, usuario.password);
    if (!passwordOk) throw new UnauthorizedException('Credenciales inválidas');

    const { password: _p, ...result } = usuario;
    return result;
  }

  async login(usuario: any) {
    const payload = { sub: usuario.id, email: usuario.email, rol: usuario.rol };
    return {
      access_token: this.jwtService.sign(payload),
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        rol: usuario.rol,
      },
    };
  }

  async getProfile(userId: string) {
    const usuario = await this.usuariosService.findById(userId);
    if (!usuario) throw new UnauthorizedException();
    const { password: _p, ...result } = usuario;
    return result;
  }
}
