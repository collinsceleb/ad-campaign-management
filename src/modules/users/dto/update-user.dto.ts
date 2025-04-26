import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsNotEmpty({ message: 'First name is required' })
  @IsString({ message: 'First name must be a string' })
  @Matches(/^[a-zA-Z]+$/, { message: 'First name must contain only letters' })
  @Matches(/^\S*$/, { message: 'First name must not contain spaces' })
  firstName: string;

  @IsNotEmpty({ message: 'Last name is required' })
  @IsString({ message: 'Last name must be a string' })
  @Matches(/^[a-zA-Z]+$/, { message: 'Last name must contain only letters' })
  @Matches(/^\S*$/, { message: 'Last name must not contain spaces' })
  lastName: string;
}
