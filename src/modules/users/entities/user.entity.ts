import {
  Check,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import * as argon2 from 'argon2';
import { Exclude } from 'class-transformer';
import {
  BaseStatus,
  RecordStatus,
} from '../../../common/entities/base-status.entity';
import { Campaign } from '../../campaign/entities/campaign.entity';
import { Payment } from '../../payments/entities/payment.entity';
import { CampaignStatus } from '../../campaign-status/entities/campaign-status.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn({
    name: 'id',
    primaryKeyConstraintName: 'PK_user_id',
  })
  id: number;

  @Column('varchar', { length: 255, nullable: false, unique: true })
  email: string;

  @Column('varchar', { length: 255, nullable: false })
  @Exclude()
  password: string;

  @Column({ name: 'first_name', nullable: true })
  firstName: string;

  @Column({ name: 'last_name', nullable: true })
  lastName: string;

  @Column({ name: 'tries', nullable: false, default: 0 })
  @Check('tries >= 0')
  failedAttempts: number;

  @Column({ name: 'last_login', nullable: true, type: 'timestamptz' })
  lastLogin: Date;

  @Column(() => BaseStatus)
  meta: BaseStatus;

  @Column({
    type: 'enum',
    enum: RecordStatus,
    default: RecordStatus.UNVERIFIED,
  })
  emailStatus: RecordStatus;

  @ManyToOne(() => CampaignStatus, (status) => status.campaigns)
  @JoinColumn({ name: 'status_id' })
  status: CampaignStatus;

  @OneToMany(() => Payment, (payment) => payment.user)
  payments: Payment[];

  @OneToMany(() => Campaign, (campaign) => campaign.owner)
  campaign: Campaign;
  async hashPassword(): Promise<void> {
    this.password = await argon2.hash(this.password);
  }

  async comparePassword(plainPassword: string): Promise<boolean> {
    return await argon2.verify(this.password, plainPassword);
  }
}
