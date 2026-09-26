import { IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

// Ο client στέλνει ΜΟΝΟ τι θέλει να κλείσει.
// Δεν στέλνει attendeeId (έρχεται από το JWT) ούτε totalCost (το υπολογίζει ο server).
// Αν τα στείλει, το forbidNonWhitelisted του main.ts επιστρέφει 400.
export class CreateBookingDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  eventId!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  ticketTypeId!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1) // «ο ζητούμενος αριθμός εισιτηρίων είναι θετικός»
  numberOfTickets!: number;
}
