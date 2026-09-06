export interface JwtPayload {
  sub: number;
  username: string;
  roles: string[];
}
// Το JwtPayload interface περιγράφει το φορτίο (payload) που περιέχεται στο JWT (JSON Web Token).