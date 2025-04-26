import { Injectable } from '@nestjs/common';
import { CreateCampaignLocationDto } from './dto/create-campaign-location.dto';
import { UpdateCampaignLocationDto } from './dto/update-campaign-location.dto';

@Injectable()
export class CampaignLocationService {
  create(createCampaignLocationDto: CreateCampaignLocationDto) {
    return 'This action adds a new campaignLocation';
  }

  findAll() {
    return `This action returns all campaignLocation`;
  }

  findOne(id: number) {
    return `This action returns a #${id} campaignLocation`;
  }

  update(id: number, updateCampaignLocationDto: UpdateCampaignLocationDto) {
    return `This action updates a #${id} campaignLocation`;
  }

  remove(id: number) {
    return `This action removes a #${id} campaignLocation`;
  }
}
