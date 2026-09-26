import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMessageDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  receiverId!: number;

  // Προαιρετικό, αν λείπει το service κρατάει την πιο πρόσφατη κράτηση που συνδέει τους δύο χρήστες.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  eventId?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  subject!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content!: string;
}