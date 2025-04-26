import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('verifications')
export class Verification {
  @PrimaryGeneratedColumn('uuid', {
    name: 'id',
    primaryKeyConstraintName: 'PK_verification_id',
  })
  id: string;
  @Column({ name: 'email', nullable: false })
  email: string;
  @Column({ name: 'passcode', nullable: false })
  passcode: string;
  @Column({ name: 'tries', nullable: false, default: 0 })
  @Check('tries >= 0')
  tries: number;
  @Column({ name: 'expires_at', nullable: false, type: 'timestamptz' })
  expiresAt: Date;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
