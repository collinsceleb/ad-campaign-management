import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { VerificationsService } from './verifications.service';

@Controller('verifications')
export class VerificationsController {
  constructor(private readonly verificationsService: VerificationsService) {}
}
