import { PartialType } from '@nestjs/mapped-types';
import { CreateCampaignLocationDto } from './create-campaign-location.dto';

export class UpdateCampaignLocationDto extends PartialType(CreateCampaignLocationDto) {}
