import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CampaignStatus } from '../../campaign-status/entities/campaign-status.entity';

@Entity('campaign_location')
export class CampaignLocation {
  @PrimaryGeneratedColumn({
    name: 'id',
    primaryKeyConstraintName: 'PK_campaign_location_id',
  })
  id: number;

  @Column('varchar', { length: 255, nullable: false })
  name: string;

  @ManyToOne(() => CampaignStatus, (status) => status.location)
  @JoinColumn({ name: 'status_id' })
  status: CampaignStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
