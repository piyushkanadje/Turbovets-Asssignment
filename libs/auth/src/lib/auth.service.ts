import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { User, UserOrganization, OrganizationRole } from '@task-manager/data';

export interface JwtPayload {
  sub: string;
  email: string;
}

export interface LoginResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
  };
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserOrganization)
    private readonly userOrgRepository: Repository<UserOrganization>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  async findUserByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findUserById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async findUserWithPassword(email: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();
  }

  async createUser(
    email: string,
    password: string,
    firstName?: string,
    lastName?: string
  ): Promise<User> {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
    });
    return this.userRepository.save(user);
  }

  async getUserOrganizationRole(
    userId: string,
    organizationId: string
  ): Promise<OrganizationRole | null> {
    const membership = await this.userOrgRepository.findOne({
      where: { userId, organizationId },
    });
    return membership?.role ?? null;
  }

  async getUserOrganizations(userId: string): Promise<UserOrganization[]> {
    return this.userOrgRepository.find({
      where: { userId },
      relations: ['organization'],
    });
  }

  async validatePassword(
    plainPassword: string,
    hashedPassword: string
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * Validates user credentials for login
   * @returns User object without password if valid, null otherwise
   */
  async validateUser(
    email: string,
    password: string
  ): Promise<Omit<User, 'password'> | null> {
    const user = await this.findUserWithPassword(email);
    if (!user) {
      return null;
    }

    const isPasswordValid = await this.validatePassword(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword as Omit<User, 'password'>;
  }

  /**
   * Generates JWT token for authenticated user
   */
  async login(user: { id: string; email: string }): Promise<LoginResponse> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
      },
    };
  }

  /**
   * Registers a new user and returns JWT token
   */
  async register(
    email: string,
    password: string,
    firstName?: string,
    lastName?: string
  ): Promise<LoginResponse> {
    // Check if user already exists
    const existingUser = await this.findUserByEmail(email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Create new user (password hashing handled by createUser)
    const newUser = await this.createUser(email, password, firstName, lastName);

    // Auto-login after registration
    return this.login(newUser);
  }
}
