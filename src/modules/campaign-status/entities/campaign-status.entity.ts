import { CreateDateColumn, Entity, OneToMany, UpdateDateColumn } from 'typeorm';
import { CampaignLocation } from '../../campaign-location/entities/campaign-location.entity';
import { Campaign } from '../../campaign/entities/campaign.entity';

@Entity('campaign_status')
export class CampaignStatus {
  id: number;
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
