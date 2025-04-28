import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { Request } from 'express';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}
  @Post('initiate/:campaignId')
  async initiatePayment(
    @Req() request: Request,
    @Param('campaignId') campaignId: number,
    @Body() amount: number,
  ) {
    return this.paymentsService.initiatePayment(request, campaignId, amount);
  }

  @Post('webhook')
  async webhook(@Body() payload: any) {
    await this.paymentsService.handleWebhook(payload);
    return { received: true };
  }

  @Get('callback')
  async callback(@Query('reference') reference: string) {
    return this.paymentsService.handleCallback(reference);
  }
}
