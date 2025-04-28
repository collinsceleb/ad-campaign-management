import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { CreateVerificationDto } from './dto/create-verification.dto';
import { UpdateVerificationDto } from './dto/update-verification.dto';
import * as dayjs from 'dayjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Verification } from './entities/verification.entity';
import { DataSource, Repository } from 'typeorm';
import { genCode } from '../../common/utils/string';
import { HelperService } from '../../common/utils/helper/helper.service';

@Injectable()
export class VerificationsService {
  constructor(
    @InjectRepository(Verification)
    private readonly verificationRepository: Repository<Verification>,
    private helperService: HelperService,
    private readonly datasource: DataSource,
  ) {}
  async createVerification(
    email: string,
    subject: string,
    messageTemplate: (code: string, expiresAt: Date) => string,
  ) {
    const queryRunner = this.datasource.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();
      const verification = queryRunner.manager.create(Verification, {
        email,
        passcode: genCode(6),
        tries: 0,
        expiresAt: dayjs().add(10, 'minutes').toDate(),
      });
      await queryRunner.manager.save(Verification, verification);
      const message = messageTemplate(
        verification.passcode,
        verification.expiresAt,
      );
      await this.helperService.sendEmail(email, message, subject);
      await queryRunner.commitTransaction();
      return verification;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('Error creating verification', error);
      throw new InternalServerErrorException(
        'An error occurred while creating verification. Please check server logs for details.',
        error.message,
      );
    } finally {
      await queryRunner.release();
    }
  }
  async findOne(email: string) {
    return await this.verificationRepository.findOne({
      where: { email: email },
    });
  }
  async deleteVerification(id: string) {
    return await this.verificationRepository.delete(id);
  }
}
