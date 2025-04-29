import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { VerificationsService } from '../verifications/verifications.service';
import { HelperService } from '../../common/utils/helper/helper.service';
import { User } from './entities/user.entity';
import {
  BaseStatus,
  RecordStatus,
} from '../../common/entities/base-status.entity';
import { Verification } from '../verifications/entities/verification.entity';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

describe('UsersService - register', () => {
  let service: UsersService;

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    },
  };
  const mockConfigService = {
    get: jest.fn(),
  };

  const mockJwtService = {
    get: jest.fn(),
  };

  const mockDataSource = {
    createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
  };

  const mockVerificationService = {
    createVerification: jest.fn(),
  };

  const mockCacheManager = {
    set: jest.fn(),
  };

  const mockHelperService = {
    sanitizeUserForCache: jest.fn().mockImplementation((user) => user),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Verification),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: getDataSourceToken(),
          useValue: mockDataSource,
        },
        { provide: VerificationsService, useValue: mockVerificationService },
        { provide: 'CACHE_MANAGER', useValue: mockCacheManager },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: HelperService, useValue: mockHelperService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should register a new user and return user + verification code', async () => {
    const dto = {
      email: 'test@example.com',
      password: 'Curiosity123&',
    };

    const mockUser = new User();
    mockUser.email = dto.email;
    mockUser.hashPassword = jest.fn();
    mockUser.meta = {
      status: RecordStatus.UNVERIFIED,
    } as unknown as BaseStatus;

    jest
      .spyOn(service as UsersService, 'checkUserExists')
      .mockResolvedValue(undefined);
    mockQueryRunner.manager.create.mockReturnValue(mockUser);
    mockQueryRunner.manager.save.mockResolvedValue(mockUser);
    mockVerificationService.createVerification.mockResolvedValue({
      code: '123456',
    });

    const result = await service.register(dto);

    expect(result.user).toEqual(mockUser);
    expect(mockUser.hashPassword).toHaveBeenCalled();
    expect(mockVerificationService.createVerification).toHaveBeenCalledWith(
      dto.email,
      'Account Registration',
      expect.any(Function),
    );
    expect(mockCacheManager.set).toHaveBeenCalledWith(
      `user:${dto.email}`,
      mockUser,
      expect.any(Number),
    );
    expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
  });

  // it('should throw if email is invalid', async () => {
  //   await expect(
  //     service.register({ email: 'invalid', password: '123' }),
  //   ).rejects.toThrow(BadRequestException);
  // });
  //
  // it('should rollback and throw if error occurs', async () => {
  //   const dto = { email: 'test@example.com', password: '12345678' };
  //   jest.spyOn(service as any, 'checkUserExists').mockImplementation(() => {
  //     throw new Error('Simulated failure');
  //   });
  //
  //   await expect(service.register(dto)).rejects.toThrow(
  //     InternalServerErrorException,
  //   );
  //   expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
  // });
});
