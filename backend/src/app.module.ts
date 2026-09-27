import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { EventsModule } from './events/events.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { MessagesModule } from './messages/messages.module';
import { BookingsModule } from './bookings/bookings.module';
import { ExportsModule } from './exports/exports.module';
// Το AuthController δηλώνεται ήδη μέσα στο AuthModule.


@Module({
  imports: [UsersModule, EventsModule, PrismaModule, AuthModule, MessagesModule, BookingsModule, ExportsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
