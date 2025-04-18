// backend/src/auth/auth.controller.ts
import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Req,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { UserTokenDto } from "./dto/refresh-token.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { LocalAuthGuard } from "./guards/local-auth.guard";
import { GoogleAuthGuard } from "./guards/google-auth.guard";
import { CurrentUser } from "./decorators/current-user.decorator";
import { Public } from "./decorators/public.decorator";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  @Public()
  @ApiOperation({ summary: "Register a new user" })
  @ApiResponse({ status: 201, description: "User registered successfully" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 409, description: "Email already exists" })
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post("login")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Login a user" })
  @ApiResponse({ status: 200, description: "User logged in successfully" })
  @ApiResponse({ status: 401, description: "Invalid credentials" })
  login(@Body() loginDto:LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post("refresh-token")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Refresh access token" })
  @ApiResponse({ status: 200, description: "Token refreshed successfully" })
  @ApiResponse({ status: 401, description: "Invalid refresh token" })
  refreshToken( @CurrentUser() user, @Body() userTokenDto: UserTokenDto) {
    return this.authService.refreshToken(userTokenDto, user);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current user profile" })
  @ApiResponse({ status: 200, description: "Returns the current user profile" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  getProfile(@CurrentUser() user) {
    return this.authService.getProfile(user.id);
  }

  @Post("logout")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Logout a user" })
  @ApiResponse({ status: 200, description: "User logged out successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  logout(@CurrentUser() user, @Body() body: { refreshToken: string }) {
    return this.authService.logout(user.id, body.refreshToken);
  }

  @Get("google")
  @UseGuards(GoogleAuthGuard)
  @Public()
  @ApiOperation({ summary: "Login with Google" })
  @ApiResponse({
    status: 302,
    description: "Redirects to Google for authentication",
  })
  googleAuth() {
    // initiates the Google OAuth2 login flow
  }

  @Get("google/callback")
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: "Google OAuth2 callback" })
  @ApiResponse({
    status: 200,
    description: "Returns the user's access and refresh tokens",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  googleAuthRedirect(@Req() req) {
    return this.authService.login(req.user);
  }
}
