import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException
} from '@nestjs/common';
import { Prisma, User as DbUser, RegistrationStatus} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PublicUserDto } from './dto/public-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private toPublicUser(user: DbUser): PublicUserDto {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      roles: user.roles,
      registrationStatus: user.registrationStatus,
    };
  }

  private handlePrismaError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Username, email or AFM already exists');
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      throw new NotFoundException('User not found');
    }

    throw error;
  }

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
        },
      });

      return this.toPublicUser(user);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  // επιστρεφει μόνο τους ενεργούς χρήστες (active: true) και τους ταξινομεί κατά αύξουσα σειρά id
  async findAll(status?: string): Promise<PublicUserDto[]> {
    const users = await this.prisma.user.findMany({
      where: { active: true,...(status ? { registrationStatus: status as RegistrationStatus } : {}), //...( ): απλώνει ό,τι βγήκε μέσα στο where
       },
      orderBy: { id: 'asc' },
    });

    return users.map((user) => this.toPublicUser(user));
  }

  // επιστρέφει μόνο τον ενεργό χρήστη με το συγκεκριμένο id (active: true)
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

  // αλλάζει το registrationStatus του χρήστη σε 'APPROVED' αφού έχει γίνει έλεγχος των στοιχείων του από τον admin.
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

  // αλλάζει το registrationStatus του χρήστη σε 'REJECTED' αφού έχει γίνει έλεγχος των στοιχείων του από τον admin.
  async reject(id: number): Promise<PublicUserDto> {
    
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('User not found');
    if (target.roles.includes('admin')) {
    throw new BadRequestException('Cannot reject an admin');
  }
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

  // επιστρέφει ολόκληρο το database user object.
  async findInternalByUsername(username: string): Promise<DbUser | null> {
    return this.prisma.user.findFirst({
      where: { username, active: true },
    });
  }
}
