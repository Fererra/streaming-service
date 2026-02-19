import { RolesGuard } from '../../src/modules/auth/guards/roles.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { UserRole } from '../../src/modules/users/user-role.enum';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as Reflector;

    guard = new RolesGuard(reflector);
  });

  const createContext = (userRole: UserRole): ExecutionContext =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          user: { role: userRole },
        }),
      }),
    }) as unknown as ExecutionContext;

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('returns true if no roles metadata', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(undefined);

    const context = createContext(UserRole.USER);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('returns true if user has required role', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue([
      UserRole.ADMIN,
    ]);

    const context = createContext(UserRole.ADMIN);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('returns false if user does not have required role', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue([
      UserRole.ADMIN,
    ]);

    const context = createContext(UserRole.USER);

    expect(guard.canActivate(context)).toBe(false);
  });
});
