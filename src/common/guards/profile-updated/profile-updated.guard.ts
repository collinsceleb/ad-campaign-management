import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { User } from '../../../modules/users/entities/user.entity';
import {
  CampaignStatus,
  CampaignStatusEnum,
} from '../../../modules/campaign-status/entities/campaign-status.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class ProfileUpdatedGuard implements CanActivate {
  constructor(
    @InjectRepository(CampaignStatus)
    private readonly campaignStatusRepository: Repository<CampaignStatus>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as User;
    const [existingUser, status] = await Promise.all([
      await this.userRepository.findOne({
        where: { id: user.id },
        relations: ['status'],
      }),
      await this.campaignStatusRepository.findOne({
        where: { name: CampaignStatusEnum.Completed },
      }),
    ]);
    if (!user) {
      throw new ForbiddenException('Unauthorized');
    }
    if (!status) {
      throw new NotFoundException('Status not found');
    }
    if (existingUser.status.id !== status.id) {
      throw new ForbiddenException(
        'Profile is not completed. Update your profile',
      );
    }
    return true;
  }
}
