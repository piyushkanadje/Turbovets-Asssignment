import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService, LoginResponse } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { OrgRolesGuard, OrgRoles } from './guards/org-roles.guard';
import { OrganizationRole } from '@task-manager/data';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

interface AuthenticatedRequest extends Request {
  user: { id: string; email: string };
  organizationId?: string;
  userOrgRole?: OrganizationRole;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Login endpoint - validates credentials and returns JWT
   * POST /auth/login
   */
  @Post('login')
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  async login(@Request() req: AuthenticatedRequest): Promise<LoginResponse> {
    return this.authService.login(req.user);
  }

  /**
   * Register endpoint - creates user and returns JWT
   * POST /auth/register
   */
  @Post('register')
  async register(@Body() registerDto: RegisterDto): Promise<LoginResponse> {
    return this.authService.register(
      registerDto.email,
      registerDto.password,
      registerDto.firstName,
      registerDto.lastName
    );
  }

  /**
   * Get current user profile
   * GET /auth/profile
   */
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req: AuthenticatedRequest) {
    const user = await this.authService.findUserById(req.user.id);
    const organizations = await this.authService.getUserOrganizations(
      req.user.id
    );
    return {
      ...user,
      organizationMemberships: organizations.map((uo) => ({
        organizationId: uo.organizationId,
        organizationName: uo.organization?.name,
        role: uo.role,
      })),
    };
  }

  /**
   * Protected test route - requires ADMIN role (OWNER also allowed due to inheritance)
   * GET /auth/org/:organizationId/admin-test
   */
  @Get('org/:organizationId/admin-test')
  @UseGuards(JwtAuthGuard, OrgRolesGuard)
  @OrgRoles(OrganizationRole.ADMIN)
  async adminTest(@Request() req: AuthenticatedRequest) {
    return {
      message: 'Access granted!',
      userId: req.user.id,
      organizationId: req.organizationId,
      userRole: req.userOrgRole,
      requiredRole: 'ADMIN (or higher)',
    };
  }

  /**
   * Protected test route - requires OWNER role only
   * GET /auth/org/:organizationId/owner-test
   */
  @Get('org/:organizationId/owner-test')
  @UseGuards(JwtAuthGuard, OrgRolesGuard)
  @OrgRoles(OrganizationRole.OWNER)
  async ownerTest(@Request() req: AuthenticatedRequest) {
    return {
      message: 'Owner access granted!',
      userId: req.user.id,
      organizationId: req.organizationId,
      userRole: req.userOrgRole,
    };
  }
}
