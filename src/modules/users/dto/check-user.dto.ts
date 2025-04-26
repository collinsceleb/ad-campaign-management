import { IsEmail, IsNotEmpty } from 'class-validator';

export class CheckUserDto {
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail()
  email: string;
}
