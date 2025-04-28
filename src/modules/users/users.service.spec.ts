

import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from './users.service';

describe('AuthService', () => {
  let userService: Partial<UsersService>;

  beforeEach(async () => {
    userService = {
      register: jest
        .fn()
        .mockResolvedValue({ id: 1, email: 'test@example.com' }),
      verifyEmail: jest.fn(),
      forgotPassword: jest.fn(),
      resetPassword: jest.fn(),
      login: jest.fn(),
      checkUserExists: jest.fn(),
      generateTokens: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersService, useValue: userService },
        JwtService,
      ],
    }).compile();

    userService = module.get(UsersService);
  });

  it('should signup a user', async () => {
    const result = await userService.register({
      email: 'test@example.com',
      password: 'password123',
    });
    expect(result).toHaveProperty('id');
    expect(result.user.email).toBe('test@example.com');
  });
});
