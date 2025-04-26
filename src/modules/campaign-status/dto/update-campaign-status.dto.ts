import { PartialType } from '@nestjs/mapped-types';
import { CreateCampaignStatusDto } from './create-campaign-status.dto';

export class UpdateCampaignStatusDto extends PartialType(CreateCampaignStatusDto) {}
