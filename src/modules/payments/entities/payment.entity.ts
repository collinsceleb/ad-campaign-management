import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Campaign } from '../../campaign/entities/campaign.entity';
import { User } from '../../users/entities/user.entity';
import { CampaignStatus } from '../../campaign-status/entities/campaign-status.entity';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Campaign, (campaign) => campaign.payments, { eager: true })
  @JoinColumn({ name: 'campaign_id' })
  campaign: Campaign;

  @ManyToOne(() => User, (user) => user.payments, { eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  reference: string;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column({ default: 'USD' })
  currency: string;

  @ManyToOne(() => CampaignStatus, (status) => status.payments)
  @JoinColumn({ name: 'status_id' })
  status: CampaignStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
