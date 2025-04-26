import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User } from '../../../modules/users/entities/user.entity';
import * as sendgridMail from '@sendgrid/mail';

@Injectable()
export class HelperService {
  constructor(private readonly configService: ConfigService) {}

  async sendEmail(to: string, text: string, subject = 'AD Campaign') {
    sendgridMail.setApiKey(this.configService.get<string>('SENDGRID_API_KEY'));

    const msg = {
      to,
      from: 'collinsceleb@gmail.com',
      subject,
      text,
    };

    try {
      return await sendgridMail.send(msg);
    } catch (error) {
      console.error(error);
    }
  }
  /**
   * Removes sensitive fields before caching a user object.
   * @param user - The User entity instance
   * @returns A sanitized object without sensitive fields
   */
  sanitizeUserForCache(user: User) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...sanitizedUser } = user;
      return sanitizedUser;
    } catch (error) {
      throw new InternalServerErrorException(
        'Unable to sanitize user for caching',
        error,
      );
    }
  }
}
