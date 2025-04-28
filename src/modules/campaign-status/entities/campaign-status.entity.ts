import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CampaignLocation } from '../../campaign-location/entities/campaign-location.entity';
import { Campaign } from '../../campaign/entities/campaign.entity';
import { Payment } from '../../payments/entities/payment.entity';

export enum CampaignStatusEnum {
  Draft = 'Draft',
  Active = 'Active',
  Inactive = 'Inactive',
  Completed = 'Completed',
  Running = 'Running',
  Paid = 'Paid',
  Pending = 'Pending',
  Failed = 'Failed',
  Success = 'success',
}
@Entity('campaign_status')
export class CampaignStatus {
  @PrimaryGeneratedColumn({
    name: 'id',
    primaryKeyConstraintName: 'PK_campaign_status_id',
  })
  id: number;
  @Column({ type: 'enum', enum: CampaignStatusEnum, nullable: false })
  name: CampaignStatusEnum;

  @OneToMany(() => CampaignLocation, (location) => location.status)
  locations: CampaignLocation[];

  @OneToMany(() => Campaign, (campaign) => campaign.status)
  campaigns: Campaign[];

  @OneToMany(() => Payment, (payment) => payment.status)
  payments: Payment[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
