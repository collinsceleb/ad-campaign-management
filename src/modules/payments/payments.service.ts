import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException, UnauthorizedException,
} from '@nestjs/common';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'node:crypto';
import { Request } from 'express';
import { Payment } from './entities/payment.entity';
import { User } from '../users/entities/user.entity';
import { Campaign } from '../campaign/entities/campaign.entity';
import {
  CampaignStatus,
  CampaignStatusEnum,
} from '../campaign-status/entities/campaign-status.entity';
import { PaystackPayload } from '../../common/class/payment/paystack-payload/paystack-payload';

@Injectable()
export class PaymentsService {
  private readonly PAYSTACK_SECRET_KEY = this.configService.get<string>(
    'PAYSTACK_SECRET_KEY',
  );
  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}
  async initiatePayment(
    request: Request,
    campaignId: number,
    amount: number,
  ): Promise<{ authorization_url: string; reference: string }> {
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();
      const user = request.user as User;
      const [existingUser, existingCampaign] = await Promise.all([
        await queryRunner.manager.findOne(User, {
          where: { id: user.id },
        }),
        await queryRunner.manager.findOne(Campaign, {
          where: { id: campaignId },
        }),
      ]);
      if (!existingUser) {
        throw new NotFoundException('User not found');
      }
      if (!existingCampaign) {
        throw new NotFoundException('Campaign not found');
      }
      const reference = `REF_${Date.now()}_${Math.floor(
        Math.random() * 10000,
      )}`;
      if (existingCampaign.amount !== amount) {
        throw new BadRequestException('Amount mismatch');
      }

      const payment = queryRunner.manager.create(Payment, {
        campaign: existingCampaign,
        user: existingUser,
        amount: amount,
        currency: 'USD',
        reference: reference,
        status: CampaignStatusEnum.Pending as unknown as CampaignStatus,
      });
      await queryRunner.manager.save(Payment, payment);
      const payload = {
        email: existingUser.email,
        amount: Math.round(Number(existingCampaign.amount) * 100), // Converts to cents
        currency: 'USD',
        reference: reference,
        metadata: {
          user: existingUser.id,
          campaign: existingCampaign.id,
        },
      };
      const response = await axios.post(
        'https://api.paystack.co/transaction/initialize',
        payload,
        {
          headers: {
            Authorization: `Bearer ${this.PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
        },
      );
      const { authorization_url } = response.data.data;
      await queryRunner.commitTransaction();
      return { authorization_url, reference };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('Error initializing payment:', error);
      throw new InternalServerErrorException(
        'An error occurred while initializing payment. Please check server logs for details.',
        error.message,
      );
    }
  }
  async verifyPayment(reference: string): Promise<boolean> {
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${this.PAYSTACK_SECRET_KEY}`,
        },
      },
    );

    return response.data.data.status === 'success';
  }

  async markPaymentAsSuccess(reference: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();
      const payment = await queryRunner.manager.findOne(Payment, {
        where: { reference },
        relations: ['campaign'],
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      if (
        payment.status ===
        (CampaignStatusEnum.Success as unknown as CampaignStatus)
      ) {
        return;
      }

      payment.status = CampaignStatusEnum.Success as unknown as CampaignStatus;
      await queryRunner.manager.save(Payment, payment);

      const campaign = payment.campaign;
      campaign.status = CampaignStatusEnum.Paid as unknown as CampaignStatus;
      await queryRunner.manager.save(Campaign, campaign);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('Error marking payment as success:', error);
      throw new InternalServerErrorException(
        'An error occurred while marking payment as success. Please check server logs for details.',
        error.message,
      );
    } finally {
      await queryRunner.release();
    }
  }

  async handleWebhook(payload: PaystackPayload, request: Request) {
    const { event, data } = payload;

    const signature = request.headers['x-paystack-signature'];
    const computed = crypto
      .createHmac('sha512', this.PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(request.body))
      .digest('hex');

    if (signature !== computed) {
      throw new UnauthorizedException('Invalid signature');
    }
    if (event === 'charge.success') {
      const reference = data.reference;
      const verified = await this.verifyPayment(reference);

      if (verified) {
        await this.markPaymentAsSuccess(reference);
      }
    }
  }

  async handleCallback(reference: string) {
    const verified = await this.verifyPayment(reference);

    if (verified) {
      await this.markPaymentAsSuccess(reference);
      return { message: 'Payment verified successfully.', reference };
    } else {
      return { message: 'Payment verification failed.', reference };
    }
  }
}
