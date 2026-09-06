export class PublicUserDto {
  id!: number;
  username!: string;
  email!: string;
  roles!: string[];
  registrationStatus!: string;
}
// Για να μην επιστρέφει το backend προς frontend όλο το user object μαζί με passwords 