import { RefreshTokenGuard } from '../../src/modules/auth/guards/refresh-token.guard';
import { TokenType } from '../../src/modules/token/types/token-types.enum';

describe('RefreshTokenGuard', () => {
  let guard: RefreshTokenGuard;

  beforeEach(() => {
    guard = new RefreshTokenGuard();
  });

  describe('extractToken', () => {
    it('should return null if no cookies', () => {
      expect(guard.extractToken({} as any)).toBeNull();
    });

    it('should return null if no refresh_token cookie', () => {
      expect(guard.extractToken({ cookies: {} } as any)).toBeNull();
    });

    it('should return token from cookie', () => {
      expect(
        guard.extractToken({
          cookies: { refresh_token: 'mytoken' },
        } as any),
      ).toBe('mytoken');
    });
  });

  describe('getSecretName', () => {
    it('should return correct secret name', () => {
      expect(guard.getSecretName()).toBe(`${TokenType.REFRESH_TOKEN}_SECRET`);
    });
  });
});
