import { Check, Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import * as argon2 from 'argon2';
import { Exclude } from 'class-transformer';
import {
  BaseStatus,
  RecordStatus,
} from '../../../common/entities/base-status.entity';

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

  @Column({ name: 'first_name' })
  firstName: string;

  @Column({ name: 'last_name' })
  lastName: string;

  @Column({ name: 'phone_number', nullable: true })
  phoneNumber: string;

  @Column({ name: 'country', nullable: true, type: 'varchar' })
  country: string;

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

  @Column({
    type: 'enum',
    enum: RecordStatus,
    default: RecordStatus.UNCOMPLETED,
  })
  profileStatus: RecordStatus;

  async hashPassword(): Promise<void> {
    this.password = await argon2.hash(this.password);
  }

  async comparePassword(plainPassword: string): Promise<boolean> {
    return await argon2.verify(this.password, plainPassword);
  }
}
