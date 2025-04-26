import {
  Column,
  CreateDateColumn,
  Index,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

// record-status.enum.ts

export enum RecordStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  DELETED = 'DELETED',
  REVOKED = 'REVOKED',
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  REJECTED = 'REJECTED',
  SUSPENDED = 'SUSPENDED',
  VERIFIED = 'VERIFIED',
  UNVERIFIED = 'UNVERIFIED',
  WITHDRAWN = 'WITHDRAWN',
  INACTIVE = 'INACTIVE',
  LOCKED = 'LOCKED',
}

export class BaseStatus {
  @Column({ nullable: true })
  createdBy: string;

  @Column({ nullable: true })
  updatedBy: string;

  @Column({ type: 'enum', enum: RecordStatus, default: RecordStatus.ACTIVE })
  @Index()
  status: RecordStatus;

  @Column({ nullable: true })
  statusChangedAt: Date;

  @Column({ nullable: true })
  statusChangedBy: string;

  @Column({ type: 'text', nullable: true })
  statusChangeReason?: string;

  @VersionColumn({ name: 'version', default: 1 })
  version: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
