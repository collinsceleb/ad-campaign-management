import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateCampaignStatusDto } from './dto/create-campaign-status.dto';
import { UpdateCampaignStatusDto } from './dto/update-campaign-status.dto';
import {
  CampaignStatus,
  CampaignStatusEnum,
} from './entities/campaign-status.entity';
import { Request } from 'express';
import { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity';

@Injectable()
export class CampaignStatusService {
  constructor(private readonly dataSource: DataSource) {}
  async createStatus(
    request: Request,
    createCampaignStatusDto: CreateCampaignStatusDto,
  ): Promise<CampaignStatus> {
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
      const { name } = createCampaignStatusDto;
      const existingStatus = await queryRunner.manager.findOne(CampaignStatus, {
        where: { name },
      });
      if (existingStatus) {
        throw new NotFoundException('Status already exists');
      }
      const newStatus = queryRunner.manager.create(CampaignStatus, {
        name,
      });
      await queryRunner.manager.save(CampaignStatus, newStatus);
      await queryRunner.commitTransaction();
      return newStatus;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('Error creating status:', error);
      throw new InternalServerErrorException(
        'An error occurred while creating status. Please check server logs for details.',
        error.message,
      );
    } finally {
      await queryRunner.release();
    }
  }

  async fetchAllStatuses(request: Request): Promise<CampaignStatus[]> {
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
      const statuses = await queryRunner.manager.find(CampaignStatus);
      if (!statuses || statuses.length === 0) {
        throw new NotFoundException('No statuses found');
      }
      await queryRunner.commitTransaction();
      return statuses;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('Error fetching statuses:', error);
      throw new InternalServerErrorException(
        'An error occurred while fetching statuses. Please check server logs for details.',
        error.message,
      );
    } finally {
      await queryRunner.release();
    }
  }

  async fetchStatusById(request: Request, id: number): Promise<CampaignStatus> {
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
      const status = await queryRunner.manager.findOne(CampaignStatus, {
        where: { id },
      });
      if (!status) {
        throw new NotFoundException('Status not found');
      }
      await queryRunner.commitTransaction();
      return status;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('Error fetching status by ID:', error);
      throw new InternalServerErrorException(
        'An error occurred while fetching status by ID. Please check server logs for details.',
        error.message,
      );
    } finally {
      await queryRunner.release();
    }
  }

  async updateStatus(
    request: Request,
    id: number,
    updateCampaignStatusDto: UpdateCampaignStatusDto,
  ): Promise<CampaignStatus> {
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
      const status = await queryRunner.manager.findOne(CampaignStatus, {
        where: { id },
      });
      if (!status) {
        throw new NotFoundException('Status not found');
      }
      const { name } = updateCampaignStatusDto;
      if (name) {
        status.name = name as CampaignStatusEnum;
      }
      await queryRunner.manager.save(CampaignStatus, status);
      await queryRunner.commitTransaction();
      return status;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('Error updating status:', error);
      throw new InternalServerErrorException(
        'An error occurred while updating the status. Please check server logs for details.',
        error.message,
      );
    } finally {
      await queryRunner.release();
    }
  }
}
