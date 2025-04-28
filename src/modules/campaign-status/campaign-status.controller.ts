import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CampaignStatusService } from './campaign-status.service';
import { CreateCampaignStatusDto } from './dto/create-campaign-status.dto';
import { UpdateCampaignStatusDto } from './dto/update-campaign-status.dto';
import { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth/jwt-auth.guard';
import { ProfileUpdatedGuard } from '../../common/guards/profile-updated/profile-updated.guard';

@UseGuards(JwtAuthGuard, ProfileUpdatedGuard)
@Controller('campaign-status')
export class CampaignStatusController {
  constructor(private readonly campaignStatusService: CampaignStatusService) {}

  @Post('create')
  async createStatus(
    @Req() request: Request,
    @Body() createCampaignStatusDto: CreateCampaignStatusDto,
  ) {
    return await this.campaignStatusService.createStatus(
      request,
      createCampaignStatusDto,
    );
  }

  @Get()
  async fetchAllStatuses(@Req() request: Request) {
    return await this.campaignStatusService.fetchAllStatuses(request);
  }

  @Get(':id')
  async fetchStatusById(@Req() request: Request, @Param('id') id: number) {
    return await this.campaignStatusService.fetchStatusById(request, id);
  }

  @Patch(':id')
  async updateStatus(
    @Req() request: Request,
    @Param('id') id: number,
    @Body() updateCampaignStatusDto: UpdateCampaignStatusDto,
  ) {
    return await this.campaignStatusService.updateStatus(
      request,
      id,
      updateCampaignStatusDto,
    );
  }
}
