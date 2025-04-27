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

@Entity('campaign_status')
export class CampaignStatus {
  @PrimaryGeneratedColumn({
    name: 'id',
    primaryKeyConstraintName: 'PK_campaign_status_id',
  })
  id: number;
  @Column('varchar', { length: 255, nullable: false, unique: true})
  name: string;

  @OneToMany(() => CampaignLocation, (location) => location.status)
  location: CampaignLocation;

  @OneToMany(() => Campaign, (campaign) => campaign.status)
  campaign: Campaign;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
