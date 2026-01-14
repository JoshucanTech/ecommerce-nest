// backend/src/auth/auth.service.ts
import {
  Inject,
  Scope,
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UserTokenDto } from './dto/refresh-token.dto';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
// import { Profile } from "@prisma/client";
import { REQUEST } from '@nestjs/core';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UsersService } from '../users/users.service';

@Injectable({ scope: Scope.REQUEST })
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
    private usersService: UsersService,
    @Inject(REQUEST) private readonly request: Request,
  ) { }

  async register(registerDto: RegisterDto) {
    const { email, password, firstName, lastName, phone, role } = registerDto;

    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        role: role || UserRole.BUYER,
      },
      include: {
        profile: true,
        positions: true,
      },
    });

    // Emit event to merge carts
    const sessionId = this.request.headers['x-session-id'] as string;
    if (sessionId) {
      this.eventEmitter.emit('user.login', {
        userId: user.id,
        sessionId,
      });
    }

    // Generate tokens
    const positions = user.positions.map((p) => p.name);
    const tokens = await this.generateTokens(user.id, user.email, user.role, positions);

    // Save refresh token
    await this.saveRefreshToken(
      user.id,
      tokens.refreshToken,
      tokens.accessToken,
    );

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      ...tokens,
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        profile: true,
        positions: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    if (!user.password || !password) {
      // console.log(user.password, password);
      throw new UnauthorizedException('Invalid credentials Password');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Emit event to merge carts
    const sessionId = this.request.headers['x-session-id'] as string;
    if (sessionId) {
      this.eventEmitter.emit('user.login', {
        userId: user.id,
        sessionId,
      });
    }

    // Delete old refresh token using userId
    await this.prisma.userTokens.deleteMany({
      where: {
        userId: user.id,
      },
    });

    // Generate tokens
    const positions = user.positions.map((p) => p.name);
    const tokens = await this.generateTokens(user.id, user.email, user.role, positions);

    // Save refresh token
    await this.saveRefreshToken(
      user.id,
      tokens.refreshToken,
      tokens.accessToken,
    );

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      ...tokens,
    };
  }

  async refreshToken(userTokenDto: UserTokenDto) {
    const { refreshToken } = userTokenDto;

    try {
      // Verify refresh token
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      // Check if token exists in database
      const storedToken = await this.prisma.userTokens.findUnique({
        where: { refreshToken },
        include: {
          user: {
            include: {
              positions: true
            }
          }
        },
      });

      if (!storedToken) {
        throw new UnauthorizedException('Invalid-D Token. Pls Signin');
      }

      // Check if user matches refresh token
      if (payload.sub !== storedToken.userId) {
        throw new UnauthorizedException('Invalid token. Pls Signin');
      }

      // Check if token is expired
      if (new Date() > storedToken.refreshExpiresAt) {
        // Delete expired token
        await this.prisma.userTokens.delete({
          where: { id: storedToken.id },
        });
        throw new UnauthorizedException('Token expired. Pls Signin');
      }

      // Generate new tokens
      const positions = storedToken.user.positions.map((p) => p.name);
      const tokens = await this.generateTokens(
        storedToken.user.id,
        storedToken.user.email,
        storedToken.user.role,
        positions,
      );

      // Delete old refresh token
      await this.prisma.userTokens.delete({
        where: { id: storedToken.id },
      });

      // Save new refresh token
      await this.saveRefreshToken(
        storedToken.user.id,
        tokens.refreshToken,
        tokens.accessToken,
      );

      return tokens;
    } catch (error) {
      // console.error("Refresh token error:", error);
      throw new UnauthorizedException(`Token error ${error}`);
    }
  }

  async getProfile(userId: string) {
    return this.usersService.findOne(userId);
  }

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    const isPasswordValid = await bcrypt.compare(pass, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException();
    }

    const { password: _, ...result } = user;
    return result;
  }

  async validateGoogleUser(profile: any): Promise<any> {
    const { email, name, picture } = profile._json;
    const firstName = profile.name.givenName;
    const lastName = profile.name.familyName;

    let user = await this.prisma.user.findUnique({
      where: { googleId: profile.id },
      include: {
        profile: true,
        positions: true
      },
    });

    if (!user) {
      // Check if email exists
      user = await this.prisma.user.findUnique({
        where: { email },
        include: {
          profile: true,
          positions: true
        },
      });

      if (user) {
        // Update googleId
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { googleId: profile.id },
          include: {
            profile: true,
            positions: true
          },
        });
      } else {
        // Create user
        user = await this.prisma.user.create({
          data: {
            email,
            firstName,
            lastName,
            googleId: profile.id,
            emailVerified: true,
            profile: {
              create: {
                avatar: picture,
              },
            },
          },
          include: {
            profile: true,
            positions: true
          },
        });
      }
    }

    // Emit event to merge carts
    const sessionId = this.request.headers['x-session-id'] as string;
    if (sessionId) {
      this.eventEmitter.emit('user.login', {
        userId: user.id,
        sessionId,
      });
    }

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async logout(userId: string, refreshToken: string) {
    // Delete refresh token
    await this.prisma.userTokens.deleteMany({
      where: {
        userId,
        // refreshToken,
      },
    });

    return { message: 'Logged out successfully' };
  }

  async deleteUser(userId: string) {
    return this.usersService.remove(userId);
  }

  async getToken() {
    const authHeader = this.request.headers['authorization'] || '';
    const token = authHeader.replace('Bearer ', '');
    return token;
  }

  private async generateTokens(userId: string, email: string, role: string, positions: string[]) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          sub: userId,
          email,
          role,
          positions,
        },
        {
          secret: this.configService.get('JWT_ACCESS_SECRET'),
          expiresIn: this.configService.get('JWT_ACCESS_EXPIRATION'),
        },
      ),
      this.jwtService.signAsync(
        {
          sub: userId,
          email,
          role,
        },
        {
          secret: this.configService.get('JWT_REFRESH_SECRET'),
          expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION'),
        },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  private async saveRefreshToken(
    userId: string,
    refreshToken: string,
    accessToken: string,
  ) {
    // Calculate expiration date
    const refreshExpiresIn = this.configService.get('JWT_REFRESH_EXPIRATION');
    const accessExpiresIn =
      this.configService.get('JWT_ACCESS_EXPIRATION') || refreshExpiresIn;

    const refreshExpiresAt = new Date();
    refreshExpiresAt.setTime(
      refreshExpiresAt.getTime() +
      this.parseExpirationTime(refreshExpiresIn) * 1000,
    );

    const accessExpiresAt = new Date();
    accessExpiresAt.setTime(
      accessExpiresAt.getTime() +
      this.parseExpirationTime(accessExpiresIn) * 1000,
    );

    // Save refresh token
    await this.prisma.userTokens.create({
      data: {
        refreshToken,
        accessToken,
        userId,
        refreshExpiresAt,
        accessExpiresAt,
      },
    });
  }

  /**
   * Parse expiration time from various formats (e.g., '7d', '600s', '24h', '30m')
   * @param expiration Expiration time string
   * @returns Expiration time in seconds
   */
  private parseExpirationTime(expiration: string): number {
    if (!expiration) return 0;

    // If it's a numeric value, return it as is
    if (/^\d+$/.test(expiration)) {
      return parseInt(expiration, 10);
    }

    // Parse time units
    const match = expiration.match(/^(\d+)([smhdw])$/);
    if (!match) {
      // If format is not recognized, try to parse as number
      return parseInt(expiration, 10) || 0;
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's': // seconds
        return value;
      case 'm': // minutes
        return value * 60;
      case 'h': // hours
        return value * 3600;
      case 'd': // days
        return value * 86400;
      case 'w': // weeks
        return value * 604800;
      default:
        return value;
    }
  }
}
