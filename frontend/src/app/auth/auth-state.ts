export interface AuthState {
  authenticated: boolean;
  username: string | null;
  roles: string[];
}
