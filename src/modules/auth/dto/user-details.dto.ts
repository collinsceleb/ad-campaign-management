import { IsEmail, IsString } from 'class-validator';

export class UserDetailsDto {
  @IsEmail()
  email: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  picture: string;
}
