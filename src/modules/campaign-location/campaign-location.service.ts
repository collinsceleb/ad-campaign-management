import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateCampaignLocationDto } from './dto/create-campaign-location.dto';
import { UpdateCampaignLocationDto } from './dto/update-campaign-location.dto';
import { DataSource } from 'typeorm';
import { CampaignLocation } from './entities/campaign-location.entity';
import { Request } from 'express';
import { User } from '../users/entities/user.entity';
import {
  CampaignStatus,
  CampaignStatusEnum,
} from '../campaign-status/entities/campaign-status.entity';

@Injectable()
export class CampaignLocationService {
  constructor(private readonly dataSource: DataSource) {}
  async createLocation(
    request: Request,
    createCampaignLocationDto: CreateCampaignLocationDto,
  ): Promise<CampaignLocation> {
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();
      const { name, status } = createCampaignLocationDto;
      const user = request.user as User;
      const existingUser = await queryRunner.manager.findOne(User, {
        where: { id: user.id },
      });
      if (!existingUser) {
        throw new NotFoundException('User not found');
      }
      const location = await queryRunner.manager.findOne(CampaignLocation, {
        where: { name },
      });
      if (location) {
        throw new BadRequestException('Location already exists');
      }
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
          where: { name: CampaignStatusEnum.Inactive },
        });
        if (!assignedStatus) {
          throw new BadRequestException(
            'Default campaign status not found. Please, contact support',
          );
        }
      }
      const newLocation = queryRunner.manager.create(CampaignLocation, {
        name,
        status: assignedStatus.id as unknown as CampaignStatus,
      });
      await queryRunner.manager.save(CampaignLocation, newLocation);
      await queryRunner.commitTransaction();
      return newLocation;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('Error creating location:', error);
      throw new InternalServerErrorException(
        'An error occurred while creating location. Please check server logs for details.',
        error.message,
      );
    } finally {
      await queryRunner.release();
    }
  }

  async fetchAllLocations(request: Request): Promise<CampaignLocation[]> {
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
      const locations = await queryRunner.manager.find(CampaignLocation, {
        relations: ['status'],
      });
      await queryRunner.commitTransaction();
      return locations;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('Error fetching locations:', error);
      throw new InternalServerErrorException(
        'An error occurred while fetching locations. Please check server logs for details.',
        error.message,
      );
    } finally {
      await queryRunner.release();
    }
  }

  async fetchLocationById(
    request: Request,
    id: number,
  ): Promise<CampaignLocation> {
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
      const location = await queryRunner.manager.findOne(CampaignLocation, {
        where: { id },
        relations: ['status'],
      });
      if (!location) {
        throw new NotFoundException('Location not found');
      }
      await queryRunner.commitTransaction();
      return location;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('Error fetching location by ID:', error);
      throw new InternalServerErrorException(
        'An error occurred while fetching location by ID. Please check server logs for details.',
        error.message,
      );
    } finally {
      await queryRunner.release();
    }
  }

  async updateLocation(
    request: Request,
    id: number,
    updateCampaignLocationDto: UpdateCampaignLocationDto,
  ): Promise<CampaignLocation> {
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
      const location = await queryRunner.manager.findOne(CampaignLocation, {
        where: { id },
      });
      if (!location) {
        throw new NotFoundException('Location not found');
      }
      const { name, status } = updateCampaignLocationDto;
      if (name) {
        location.name = name;
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
        location.status = campaignStatus;
      }
      await queryRunner.manager.save(CampaignLocation, location);
      await queryRunner.commitTransaction();
      return location;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('Error updating location:', error);
      throw new InternalServerErrorException(
        'An error occurred while updating the location. Please check server logs for details.',
        error.message,
      );
    } finally {
      await queryRunner.release();
    }
  }
}
