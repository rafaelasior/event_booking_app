import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../guards/jwt.auth.guard';
import {RolesGuard} from "../auth/roles.guard";
import {Roles} from "../auth/roles.decorator";

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}



  @Roles('admin')
  @UseGuards(RolesGuard)
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @Roles('admin')
  @UseGuards(RolesGuard)
  @Patch(':id/approve')
  approve(@Param('id') id: string) {
    return this.usersService.approve(+id);
  }

  @Roles('admin')
  @UseGuards(RolesGuard)
  @Patch(':id/reject')
  reject(@Param('id') id: string) {
    return this.usersService.reject(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(+id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }
}
