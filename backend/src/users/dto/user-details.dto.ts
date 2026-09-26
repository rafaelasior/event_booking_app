import { PublicUserDto } from './public-user.dto';

// Όλα τα στοιχεία του χρήστη για τη σελίδα του admin. Ποτέ passwordHash.
export class UserDetailsDto extends PublicUserDto {
  firstName!: string;
  lastName!: string;
  phone!: string;
  address!: string;
  city!: string;
  country!: string;
  AFM!: string;
  latitude!: number | null;
  longitude!: number | null;
  createdAt!: Date;
}