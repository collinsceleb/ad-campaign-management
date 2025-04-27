import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { CampaignLocationService } from './campaign-location.service';
import { CreateCampaignLocationDto } from './dto/create-campaign-location.dto';
import { UpdateCampaignLocationDto } from './dto/update-campaign-location.dto';
import { Request } from 'express';
import { CampaignLocation } from './entities/campaign-location.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('campaign-location')
export class CampaignLocationController {
  constructor(
    private readonly campaignLocationService: CampaignLocationService,
  ) {}

  @Post()
  async createLocation(
    @Req() request: Request,
    @Body() createCampaignLocationDto: CreateCampaignLocationDto,
  ) {
    return await this.campaignLocationService.createLocation(
      request,
      createCampaignLocationDto,
    );
  }

  @Get()
  async fetchAllLocations(
    @Req() request: Request,
  ): Promise<CampaignLocation[]> {
    return await this.campaignLocationService.fetchAllLocations(request);
  }

  @Get(':id')
  async fetchLocationById(
    @Req() request: Request,
    @Param('id') id: number,
  ): Promise<CampaignLocation> {
    return await this.campaignLocationService.fetchLocationById(request, id);
  }

  @Patch(':id')
  async updateLocation(
    @Req() request: Request,
    @Param('id') id: number,
    @Body() updateCampaignLocationDto: UpdateCampaignLocationDto,
  ): Promise<CampaignLocation> {
    return await this.campaignLocationService.updateLocation(
      request,
      id,
      updateCampaignLocationDto,
    );
  }
}
