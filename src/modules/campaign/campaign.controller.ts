import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFiles,
  Query,
} from '@nestjs/common';
import { CampaignService } from './campaign.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth/jwt-auth.guard';
import { ProfileUpdatedGuard } from '../../common/guards/profile-updated/profile-updated.guard';
import { Request } from 'express';
import { Campaign } from './entities/campaign.entity';
import { FilesInterceptor } from '@nestjs/platform-express';
import { uploadToCloudinary } from '../../common/utils/cloudinary';
import { CampaignResponse } from '../../common/class/campaign-response/campaign-response';

@UseGuards(JwtAuthGuard, ProfileUpdatedGuard)
@Controller('campaign')
export class CampaignController {
  constructor(private readonly campaignService: CampaignService) {}

  @Post('create')
  @UseInterceptors(FilesInterceptor('banners', 5))
  async createCampaign(
    @UploadedFiles() banners: Express.Multer.File[],
    @Req() request: Request,
    @Body() createCampaignDto: CreateCampaignDto,
  ): Promise<Campaign> {
    const uploadedUrls = await Promise.all(
      banners.map((banner) => uploadToCloudinary(banner)),
    );
    return await this.campaignService.createCampaign(
      request,
      createCampaignDto,
      uploadedUrls,
    );
  }

  @Get()
  async fetchAllCampaigns(
    @Query('page') page: number,
    @Query('limit') limit: number,
  ): Promise<{
    data: CampaignResponse[];
    total: number;
    page: number;
    lastPage: number;
  }> {
    page = page ? Number(page) : 1;
    limit = limit ? Number(limit) : 10;
    return await this.campaignService.fetchAllCampaigns(page, limit);
  }

  @Get(':id')
  async fetchCampaignById(@Param('id') id: number) {
    return await this.campaignService.fetchCampaignById(id);
  }

  @UseInterceptors(FilesInterceptor('banner'))
  @Patch(':id')
  async updateCampaign(
    @UploadedFiles() files: Express.Multer.File[],
    @Req() request: Request,
    @Param('id') id: number,
    @Body() updateCampaignDto: UpdateCampaignDto,
  ): Promise<Campaign> {
    const uploadedUrls = await Promise.all(
      files.map((file) => uploadToCloudinary(file)),
    );
    return await this.campaignService.updateCampaign(
      request,
      id,
      updateCampaignDto,
      uploadedUrls,
    );
  }

  @Patch(':campaignId/extend')
  async extendCampaignToNewLocation(
    @Req() request: Request,
    @Param('campaignId') campaignId: number,
    @Body('locationId') locationId: number,
  ): Promise<Campaign> {
    return await this.campaignService.extendCampaignToNewLocation(
      request,
      campaignId,
      locationId,
    );
  }
}
