import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CampaignStatus } from '../../campaign-status/entities/campaign-status.entity';
import { CampaignLocation } from '../../campaign-location/entities/campaign-location.entity';
import { User } from '../../users/entities/user.entity';

@Entity('campaigns')
export class Campaign {
  @PrimaryGeneratedColumn({
    name: 'id',
    primaryKeyConstraintName: 'PK_campaigns_id',
  })
  id: number;

  @Column('varchar', { length: 255, nullable: false })
  name: string;

  @Column({ name: 'from', nullable: true, type: 'timestamptz' })
  from: Date;

  @Column({ name: 'to', nullable: true, type: 'timestamptz' })
  to: Date;

  @ManyToOne(() => CampaignStatus, (status) => status.campaign)
  @JoinColumn({ name: 'status_id' })
  status: CampaignStatus;

  @ManyToMany(() => CampaignLocation, { cascade: true })
  @JoinTable({
    name: 'campaign_locations',
    joinColumn: {
      name: 'campaign_id',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'fk_campaign_locations_campaign_id',
    },
    inverseJoinColumn: {
      name: 'location_id',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'fk_campaign_locations_location_id',
    },
  })
  locations: CampaignLocation[];

  @ManyToOne(() => User, (user) => user.campaign)
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @Column('decimal', {
    name: 'amount',
    nullable: false,
    precision: 10,
    scale: 2,
  })
  amount: number;

  @Column('simple-array')
  banners: string[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
