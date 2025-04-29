import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { Request } from 'express';
import { PaystackPayload } from '../../common/class/payment/paystack-payload/paystack-payload';
import { JwtAuthGuard } from '../../common/guards/jwt-auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
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
  async webhook(@Body() payload: PaystackPayload, @Req() request: Request) {
    await this.paymentsService.handleWebhook(payload, request);
    return { received: true };
  }

  @Get('callback')
  async callback(@Query('reference') reference: string) {
    return this.paymentsService.handleCallback(reference);
  }
}
