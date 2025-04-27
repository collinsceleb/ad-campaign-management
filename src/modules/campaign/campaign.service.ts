import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Campaign } from './entities/campaign.entity';
import { DataSource, Repository } from 'typeorm';
import { CampaignStatus } from '../campaign-status/entities/campaign-status.entity';
import { CampaignLocation } from '../campaign-location/entities/campaign-location.entity';
import { Request } from 'express';
import { User } from '../users/entities/user.entity';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { CampaignResponse } from '../../common/class/campaign-response/campaign-response';

@Injectable()
export class CampaignService {
  private readonly REDIS_TTL_IN_MILLISECONDS =
    this.configService.get<number>('REDIS_TTL') * 1000;
  constructor(
    @InjectRepository(Campaign)
    private readonly campaignRepository: Repository<Campaign>,
    @InjectRepository(CampaignStatus)
    private readonly campaignStatusRepository: Repository<CampaignStatus>,
    @InjectRepository(CampaignLocation)
    private readonly campaignLocationRepository: Repository<CampaignLocation>,
    private readonly dataSource: DataSource,
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
          where: { name: campaignStatusName as unknown as string },
        });
        if (!assignedStatus) {
          throw new BadRequestException(
            `Status ${campaignStatusName} does not exist`,
          );
        }
      } else {
        assignedStatus = await queryRunner.manager.findOne(CampaignStatus, {
          where: { name: 'Draft' },
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
      await queryRunner.commitTransaction();
      await this.cacheManager.set(
        `campaign: ${newCampaign.id}`,
        newCampaign,
        this.REDIS_TTL_IN_MILLISECONDS,
      );
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
      // const [cachedCampaigns] = await this.cacheManager.get<Campaign[]>(
      //   'campaigns',
      // );
      // if (cachedCampaigns) {
      //   return cachedCampaigns;
      // }
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
          status: campaign.status.name,
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
      await this.cacheManager.set(
        'campaigns',
        data,
        this.REDIS_TTL_IN_MILLISECONDS,
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
        throw new Error('Campaign not found');
      }
      const data: CampaignResponse = {
        id: campaign.id,
        name: campaign.name,
        from: campaign.from,
        to: campaign.to,
        status: campaign.status.name,
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
      await this.cacheManager.set(
        `campaign: ${id}`,
        data,
        this.REDIS_TTL_IN_MILLISECONDS,
      );
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
            where: { name: status as unknown as string },
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
      await this.cacheManager.set(
        `campaign: ${campaign.id}`,
        campaign,
        this.REDIS_TTL_IN_MILLISECONDS,
      );
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
}
