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

@Injectable({ scope: Scope.REQUEST })
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    @Inject(REQUEST) private readonly request: Request,
  ) {}

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
      },
    });

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email, user.role);

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

    // Delete old refresh token using userId
    await this.prisma.userTokens.deleteMany({
      where: {
        userId: user.id,
      },
    });

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email, user.role);

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

  async refreshToken(userTokenDto: UserTokenDto, user: any) {
    const { refreshToken } = userTokenDto;

    try {
      // Verify refresh token
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      // Check if token exists in database
      const storedToken = await this.prisma.userTokens.findUnique({
        where: { refreshToken },
        include: { user: true },
      });

      if (!storedToken) {
        throw new UnauthorizedException('Invalid-D Token. Pls Signin');
      }

      // Check if user matches refresh token
      // const token = await this.getToken();
      // const decoded = this.jwtService.decode(token);

      // if (decoded.sub !== storedToken.userId) {
      if (user.id !== storedToken.userId) {
        // console.log("decoded.sub !== storedToken.userId Does not match");
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
      const tokens = await this.generateTokens(
        storedToken.user.id,
        storedToken.user.email,
        storedToken.user.role,
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
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        wishlistItems: true,
        addresses: {
          where: { isDefault: true },
        },
        vendor: {
          select: {
            id: true,
            businessName: true,
            slug: true,
            isVerified: true,
          },
        },
        rider: {
          select: {
            id: true,
            isVerified: true,
            isAvailable: true,
          },
        },
        settings: true,
      },
    });
    // console.log(user.vendor);

    if (!user) {
      throw new BadRequestException('User not found. Pls Signin');
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
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
      include: { profile: true },
    });

    if (!user) {
      // Check if email exists
      user = await this.prisma.user.findUnique({
        where: { email },
        include: { profile: true },
      });

      if (user) {
        // Update googleId
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { googleId: profile.id },
          include: { profile: true },
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
          include: { profile: true },
        });
      }
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

  async getToken() {
    const authHeader = this.request.headers['authorization'] || '';
    const token = authHeader.replace('Bearer ', '');
    return token;
  }

  private async generateTokens(userId: string, email: string, role: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          sub: userId,
          email,
          role,
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
    const accessExpiresIn = this.configService.get('JWT_REFRESH_EXPIRATION');

    const refreshExpiresAt = new Date();
    refreshExpiresAt.setTime(
      refreshExpiresAt.getTime() + Number.parseInt(refreshExpiresIn) * 1000,
    );

    const accessExpiresAt = new Date();
    refreshExpiresAt.setTime(
      refreshExpiresAt.getTime() + Number.parseInt(accessExpiresIn) * 1000,
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
}
