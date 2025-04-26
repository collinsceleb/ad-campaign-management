import { Injectable } from '@nestjs/common';
import { CreateCampaignStatusDto } from './dto/create-campaign-status.dto';
import { UpdateCampaignStatusDto } from './dto/update-campaign-status.dto';

@Injectable()
export class CampaignStatusService {
  create(createCampaignStatusDto: CreateCampaignStatusDto) {
    return 'This action adds a new campaignStatus';
  }

  findAll() {
    return `This action returns all campaignStatus`;
  }

  findOne(id: number) {
    return `This action returns a #${id} campaignStatus`;
  }

  update(id: number, updateCampaignStatusDto: UpdateCampaignStatusDto) {
    return `This action updates a #${id} campaignStatus`;
  }

  remove(id: number) {
    return `This action removes a #${id} campaignStatus`;
  }
}
