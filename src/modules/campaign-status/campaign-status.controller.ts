import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CampaignStatusService } from './campaign-status.service';
import { CreateCampaignStatusDto } from './dto/create-campaign-status.dto';
import { UpdateCampaignStatusDto } from './dto/update-campaign-status.dto';

@Controller('campaign-status')
export class CampaignStatusController {
  constructor(private readonly campaignStatusService: CampaignStatusService) {}

  @Post()
  create(@Body() createCampaignStatusDto: CreateCampaignStatusDto) {
    return this.campaignStatusService.create(createCampaignStatusDto);
  }

  @Get()
  findAll() {
    return this.campaignStatusService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.campaignStatusService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCampaignStatusDto: UpdateCampaignStatusDto) {
    return this.campaignStatusService.update(+id, updateCampaignStatusDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.campaignStatusService.remove(+id);
  }
}
