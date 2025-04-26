import { User } from '../../../modules/users/entities/user.entity';
export class JwtPayload {
  sub: User;
  email: string;
  jwtId: string;
}
