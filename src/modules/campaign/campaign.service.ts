import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { Campaign } from './entities/campaign.entity';
import { Between, DataSource, LessThan, Repository } from 'typeorm';
import {
  CampaignStatus,
  CampaignStatusEnum,
} from '../campaign-status/entities/campaign-status.entity';
import { CampaignLocation } from '../campaign-location/entities/campaign-location.entity';
import { Request } from 'express';
import { User } from '../users/entities/user.entity';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { CampaignResponse } from '../../common/class/campaign-response/campaign-response';
import { HelperService } from '../../common/utils/helper/helper.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class CampaignService {
  private readonly REDIS_TTL_IN_MILLISECONDS =
    this.configService.get<number>('REDIS_TTL') * 1000;
  constructor(
    @InjectRepository(Campaign)
    private readonly campaignRepository: Repository<Campaign>,
    private readonly dataSource: DataSource,
    private readonly helperService: HelperService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly configService: ConfigService,
  ) {}
  async createCampaign(
    request: Request,
    createCampaignDto: CreateCampaignDto,
    banners: string[],
  ): Promise<Campaign> {
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();
      const { name, from, to, amount, locations, status } = createCampaignDto;
      const user = request.user as User;
      const existingUser = await queryRunner.manager.findOne(User, {
        where: { id: user.id },
      });
      if (!existingUser) {
        throw new NotFoundException('User not found');
      }
      if (!Array.isArray(locations)) {
        throw new BadRequestException('Locations must be arrays');
      }
      // Find or create keywords
      const locationEntities = await Promise.all(
        locations.map(async (location: CampaignLocation) => {
          let existingLocation = await queryRunner.manager.findOne(
            CampaignLocation,
            {
              where: { name: location.name },
            },
          );

          if (!existingLocation) {
            existingLocation = queryRunner.manager.create(CampaignLocation, {
              name: location.name,
            });
            await queryRunner.manager.save(existingLocation);
          }

          return existingLocation;
        }),
      );
      let assignedStatus: CampaignStatus;
      const campaignStatusName = status;
      if (campaignStatusName) {
        assignedStatus = await queryRunner.manager.findOne(CampaignStatus, {
          where: { name: campaignStatusName as unknown as CampaignStatusEnum },
        });
        if (!assignedStatus) {
          throw new BadRequestException(
            `Status ${campaignStatusName} does not exist`,
          );
        }
      } else {
        assignedStatus = await queryRunner.manager.findOne(CampaignStatus, {
          where: { name: CampaignStatusEnum.Draft },
        });
        if (!assignedStatus) {
          throw new BadRequestException(
            'Default campaign status not found. Please, contact support',
          );
        }
      }
      const newCampaign = queryRunner.manager.create(Campaign, {
        name,
        from,
        to,
        amount,
        owner: existingUser,
        status: assignedStatus.id as unknown as CampaignStatus,
        locations: locationEntities,
        banners,
      });
      await queryRunner.manager.save(Campaign, newCampaign);
      if (existingUser.email) {
        await this.sendCampaignCreationEmail(
          newCampaign.owner.email,
          'New Campaign Created',
          (name, from, to) =>
            `A new campaign has been created with the name: ${name.toUpperCase()} which will start on ${from} end on ${to}.`,
          newCampaign.name,
          newCampaign.from,
          newCampaign.to,
        );
      }
      await queryRunner.commitTransaction();
      return newCampaign;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('Error creating campaign:', error);
      throw new InternalServerErrorException(
        'An error occurred while creating the campaign. Please check server logs for details.',
        error.message,
      );
    } finally {
      await queryRunner.release();
    }
  }

  async fetchAllCampaigns(
    page: number,
    limit: number,
  ): Promise<{
    data: CampaignResponse[];
    total: number;
    page: number;
    lastPage: number;
  }> {
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();
      const [campaigns, total] = await queryRunner.manager.findAndCount(
        Campaign,
        {
          skip: (page - 1) * limit,
          take: limit,
          relations: ['owner', 'status', 'locations'],
          order: { createdAt: 'DESC' },
        },
      );
      const data: CampaignResponse[] = campaigns.map(
        (campaign: Campaign): CampaignResponse => ({
          id: campaign.id,
          name: campaign.name,
          from: campaign.from,
          to: campaign.to,
          status: campaign.status.name as unknown as string,
          owner: {
            id: campaign.owner.id,
            email: campaign.owner.email,
          },
          locations: campaign.locations.map((location) => ({
            id: location.id,
            name: location.name,
          })),
          dailyBudget: this.calculateDailyBudget(
            campaign.amount,
            campaign.from,
            campaign.to,
          ),
          totalBudget: campaign.amount,
          banners: campaign.banners,
        }),
      );
      await queryRunner.commitTransaction();
      return { data, total, page, lastPage: Math.ceil(total / limit) };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('Error fetching campaigns:', error);
      throw new InternalServerErrorException(
        'An error occurred while fetching campaigns. Please check server logs for details.',
        error.message,
      );
    } finally {
      await queryRunner.release();
    }
  }

  private calculateDailyBudget(amount: number, from: Date, to: Date) {
    const diffInTime = new Date(to).getTime() - new Date(from).getTime();
    const days = Math.ceil(diffInTime / (1000 * 3600 * 24));
    return +(amount / (days || 1)).toFixed(2);
  }

  async fetchCampaignById(id: number): Promise<{ data: CampaignResponse }> {
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();
      const cachedCampaign = await this.cacheManager.get<CampaignResponse>(
        `campaign: ${id}`,
      );
      if (cachedCampaign) {
        return { data: cachedCampaign };
      }
      const campaign = await queryRunner.manager.findOne(Campaign, {
        where: { id },
        relations: ['owner', 'status', 'locations'],
      });
      if (!campaign) {
        throw new NotFoundException('Campaign not found');
      }
      const data: CampaignResponse = {
        id: campaign.id,
        name: campaign.name,
        from: campaign.from,
        to: campaign.to,
        status: campaign.status.name as unknown as string,
        owner: {
          id: campaign.owner.id,
          email: campaign.owner.email,
        },
        locations: campaign.locations.map((location) => ({
          id: location.id,
          name: location.name,
        })),
        dailyBudget: this.calculateDailyBudget(
          campaign.amount,
          campaign.from,
          campaign.to,
        ),
        totalBudget: campaign.amount,
        banners: campaign.banners,
      };
      return { data };
    } catch (error) {
      console.error('Error fetching campaign by ID:', error);
      throw new InternalServerErrorException(
        'An error occurred while fetching the campaign by ID. Please check server logs for details.',
        error.message,
      );
    }
  }

  async updateCampaign(
    request: Request,
    id: number,
    updateCampaignDto: UpdateCampaignDto,
    banners?: string[],
  ): Promise<Campaign> {
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();
      const user = request.user as User;
      const existingUser = await queryRunner.manager.findOne(User, {
        where: { id: user.id },
      });
      if (!existingUser) {
        throw new NotFoundException('User not found');
      }
      const campaign = await queryRunner.manager.findOne(Campaign, {
        where: { id },
      });
      if (!campaign) {
        throw new NotFoundException('Campaign not found');
      }
      const { name, from, to, amount, locations, status } = updateCampaignDto;
      if (name) {
        campaign.name = name;
      }
      if (from) {
        campaign.from = from;
      }
      if (to) {
        campaign.to = to;
      }
      if (amount) {
        campaign.amount = amount;
      }
      if (status) {
        const campaignStatus = await queryRunner.manager.findOne(
          CampaignStatus,
          {
            where: { name: status as unknown as CampaignStatusEnum },
          },
        );
        if (!campaignStatus) {
          throw new NotFoundException(`Status ${status} does not exist`);
        }
        campaign.status = campaignStatus;
      }
      if (locations) {
        campaign.locations = await Promise.all(
          locations.map(async (location: CampaignLocation) => {
            let existingLocation = await queryRunner.manager.findOne(
              CampaignLocation,
              {
                where: { name: location.name },
              },
            );

            if (!existingLocation) {
              existingLocation = queryRunner.manager.create(CampaignLocation, {
                name: location.name,
              });
              await queryRunner.manager.save(existingLocation);
            }

            return existingLocation;
          }),
        );
      }
      if (banners && banners.length > 0) {
        campaign.banners = banners;
      }
      await queryRunner.manager.save(Campaign, campaign);
      await queryRunner.commitTransaction();
      return campaign;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('Error updating campaign:', error);
      throw new InternalServerErrorException(
        'An error occurred while updating the campaign. Please check server logs for details.',
        error.message,
      );
    } finally {
      await queryRunner.release();
    }
  }

  async extendCampaignToNewLocation(
    request: Request,
    campaignId: number,
    locationId: number,
  ): Promise<Campaign> {
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();
      const user = request.user as User;
      const existingUser = await queryRunner.manager.findOne(User, {
        where: { id: user.id },
      });
      if (!existingUser) {
        throw new NotFoundException('User not found');
      }
      const [campaign, location] = await Promise.all([
        await queryRunner.manager.findOne(Campaign, {
          where: { id: campaignId },
          relations: ['locations'],
        }),
        await queryRunner.manager.findOne(CampaignLocation, {
          where: { id: locationId },
        }),
      ]);
      if (!campaign) {
        throw new NotFoundException('Campaign not found');
      }
      if (!location) {
        throw new NotFoundException('Location not found');
      }
      const existingLocation = campaign.locations.some(
        (loc) => loc.id === location.id,
      );
      if (existingLocation) {
        throw new BadRequestException('Location already added to the campaign');
      }
      campaign.locations.push(location);
      await queryRunner.manager.save(Campaign, campaign);
      await queryRunner.commitTransaction();
      return campaign;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('Error extending campaign to new location:', error);
      throw new InternalServerErrorException(
        'An error occurred while extending campaign to new location. Please check server logs for details.',
        error.message,
      );
    } finally {
      await queryRunner.release();
    }
  }
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async sendTwoDaysBeforeEndReminder() {
    try {
      const today = new Date();
      const twoDaysLater = new Date();
      twoDaysLater.setDate(today.getDate() + 2);

      const from = new Date(twoDaysLater);
      from.setHours(0, 0, 0, 0);
      const to = new Date(twoDaysLater);
      to.setHours(23, 59, 59, 999);

      const campaigns = await this.campaignRepository.find({
        where: {
          status: CampaignStatusEnum.Running as unknown as CampaignStatus,
          to: Between(from, to),
        },
        relations: ['owner'],
      });

      for (const campaign of campaigns) {
        if (campaign.owner?.email) {
          await this.sendReminderEmail(
            campaign.owner.email,
            'Important Reminder',
            (name, to) =>
              `Your campaign with the name: ${name.toUpperCase()} will end in 2 days on ${to}. Please review your campaign status and make any final adjustments before it concludes.`,
            campaign.name,
            campaign.to,
          );
        }
      }

      if (campaigns.length) {
        console.log(
          `[CronJob] Sent ${campaigns.length} campaign reminder email(s) ✅`,
        );
      }
    } catch (error) {
      console.error('Error sending reminder emails:', error);
      throw new InternalServerErrorException(
        'An error occurred while sending reminder emails. Please check server logs for details.',
        error.message,
      );
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async autoCompleteCampaigns() {
    try {
      const today = new Date();

      const campaigns = await this.campaignRepository.find({
        where: {
          status: CampaignStatusEnum.Running as unknown as CampaignStatus,
          to: LessThan(today),
        },
        relations: ['owner'],
      });

      for (const campaign of campaigns) {
        campaign.status =
          CampaignStatusEnum.Completed as unknown as CampaignStatus;
        await this.campaignRepository.save(campaign);

        if (campaign.owner?.email) {
          await this.sendReminderEmail(
            campaign.owner.email,
            'Important Reminder',
            (name, to) =>
              `This is just to let you know that your campaign with the name: ${name.toUpperCase()} has completed on  ${to}.`,
            campaign.name,
            campaign.to,
          );
        }
      }
      if (campaigns.length) {
        console.log(
          `[CronJob] Auto-completed and notified ${campaigns.length} campaign(s) ✅`,
        );
      }
    } catch (error) {
      console.error('Error auto-completing campaigns:', error);
      throw new InternalServerErrorException(
        'An error occurred while auto-completing campaigns. Please check server logs for details.',
        error.message,
      );
    }
  }

  private async sendReminderEmail(
    email: string,
    subject: string,
    messageTemplate: (name: string, to: Date) => string,
    name?: string,
    to?: Date,
  ) {
    const message = messageTemplate(name, to);
    await this.helperService.sendEmail(email, message, subject);
  }

  private async sendCampaignCreationEmail(
    email: string,
    subject: string,
    messageTemplate: (name: string, from: Date, to: Date) => string,
    name?: string,
    from?: Date,
    to?: Date,
  ) {
    const message = messageTemplate(name, from, to);
    await this.helperService.sendEmail(email, message, subject);
  }
}
