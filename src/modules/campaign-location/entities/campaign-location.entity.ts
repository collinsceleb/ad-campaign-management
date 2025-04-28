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

  @Column('varchar', { length: 255, nullable: false, unique: true })
  name: string;

  @ManyToOne(() => CampaignStatus, (status) => status.locations)
  @JoinColumn({ name: 'status_id' })
  status: CampaignStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
