import { Controller, Get, Patch, Param, Delete, Body, UseGuards, Query, ParseIntPipe } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../guards/jwt-auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@UseGuards(JwtAuthGuard)  // Έτσι όλα τα /users endpoints χρειάζονται login token.
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Roles('admin')  
  @UseGuards(RolesGuard)

//   χωρίς token -> 401 Unauthorized
// με token απλού user -> 403 Forbidden
// με token admin -> περνάει

  @Get()
  findAll(@Query('status') status? : string) {
    return this.usersService.findAll(status);
  }

  @Roles('admin')
  @UseGuards(RolesGuard)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: string) {
    return this.usersService.findOne(+id);
  }

  // Δίνουν στον admin endpoints για να εγκρίνει ή να απορρίψει χρήστες που έχουν κάνει register.
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

  @Roles('admin')
  @UseGuards(RolesGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(+id, updateUserDto);
  }

  @Roles('admin')
  @UseGuards(RolesGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }
}
