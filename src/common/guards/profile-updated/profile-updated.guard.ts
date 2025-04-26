import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { RecordStatus } from '../../entities/base-status.entity';
import { User } from '../../../modules/users/entities/user.entity';

@Injectable()
export class ProfileUpdatedGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as User;
    if (!user) {
      throw new ForbiddenException('Unauthorized');
    }
    if (user.profileStatus !== RecordStatus.COMPLETED) {
      throw new ForbiddenException('Profile is not completed');
    }
    return true;
  }
}
