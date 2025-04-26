import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CampaignLocationService } from './campaign-location.service';
import { CreateCampaignLocationDto } from './dto/create-campaign-location.dto';
import { UpdateCampaignLocationDto } from './dto/update-campaign-location.dto';

@Controller('campaign-location')
export class CampaignLocationController {
  constructor(private readonly campaignLocationService: CampaignLocationService) {}

  @Post()
  create(@Body() createCampaignLocationDto: CreateCampaignLocationDto) {
    return this.campaignLocationService.create(createCampaignLocationDto);
  }

  @Get()
  findAll() {
    return this.campaignLocationService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.campaignLocationService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCampaignLocationDto: UpdateCampaignLocationDto) {
    return this.campaignLocationService.update(+id, updateCampaignLocationDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.campaignLocationService.remove(+id);
  }
}
