import { Module } from '@nestjs/common';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],        // το service κάνει queries στη βάση
  controllers: [MessagesController],
  providers: [MessagesService],
  exports: [MessagesService],     // για να μπορεί να χρησιμοποιηθεί από το EventsModule
})
export class MessagesModule {}
