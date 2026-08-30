import {
  Injectable,
  NotImplementedException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma, User as DbUser } from '../generated/prisma/client.mjs';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { USERS } from './mock-users';
import { PublicUserDto } from './dto/public-user.dto';

@Injectable()
export class UsersService {
  private readonly users: User[] = USERS;

  constructor(private readonly prisma: PrismaService) {}

  async create(
    createUserDto: CreateUserDto,
    passwordHash: string,
  ): Promise<PublicUserDto> {
    try {
      const user = await this.prisma.user.create({
        data: {
          username: createUserDto.username,
          email: createUserDto.email,
          passwordHash,
          roles: ['user'],
          active: true,
          firstName: createUserDto.firstName,
          lastName: createUserDto.lastName,
          phone: createUserDto.phone,
          address: createUserDto.address,
          city: createUserDto.city,
          country: createUserDto.country,
          latitude: createUserDto.latitude,
          longitude: createUserDto.longitude,
          AFM: createUserDto.AFM,
          // registrationStatus is intentionally omitted
          // Prisma applies the default PENDING
        },
      });

      return this.toPublicUser(user);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async findAll(): Promise<PublicUserDto[]> {
    const users = await this.prisma.user.findMany({
      where: { active: true },
      orderBy: { id: 'asc' },
    });
    return users.map((user) => this.toPublicUser(user));
  }

  async findOne(id: number): Promise<PublicUserDto> {
    const user = await this.prisma.user.findFirst({
      where: { id, active: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.toPublicUser(user);
  }

  async update(
    id: number,
    updateUserDto: UpdateUserDto,
  ): Promise<PublicUserDto> {
    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: updateUserDto,
      });
      return this.toPublicUser(user);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async remove(id: number): Promise<PublicUserDto> {
    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: { active: false },
      });
      return this.toPublicUser(user);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  private toPublicUser(user: User): PublicUserDto {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      roles: user.roles,
      registrationStatus: user.registrationStatus,
    };
  }

  async findInternalByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: { username, active: true },
    });
  }

  private handlePrismaError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Username or email already exists');
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      throw new NotFoundException('User not found');
    }
    throw error;
  }

  async approve(id: number): Promise<PublicUserDto> {
    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: {
          registrationStatus: 'APPROVED',
        },
      });

      return this.toPublicUser(user);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async reject(id: number): Promise<PublicUserDto> {
    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: {
          registrationStatus: 'REJECTED',
        },
      });

      return this.toPublicUser(user);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }
}
