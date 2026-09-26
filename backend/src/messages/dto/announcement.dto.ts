import { PickType } from '@nestjs/mapped-types';
import { CreateMessageDto } from './create-message.dto';

export class AnnouncementDto extends PickType(CreateMessageDto, ['subject', 'content'] as const) {}