import { JwtGuard } from 'src/modules/auth/jwt.guard';
import { TokenType } from 'src/modules/token/types/token-types.enum';

describe('JwtGuard', () => {
  let guard: JwtGuard;

  beforeEach(() => {
    guard = new JwtGuard({} as any, {} as any, {} as any);
  });

  describe('extractToken', () => {
    it('should return null if no header', () => {
      expect(guard.extractToken({ headers: {} } as any)).toBeNull();
    });

    it('should return null if scheme is not Bearer', () => {
      expect(
        guard.extractToken({ headers: { Authorization: 'Token abc' } } as any),
      ).toBeNull();
    });

    it('should return null if token is missing', () => {
      expect(
        guard.extractToken({ headers: { Authorization: 'Bearer' } } as any),
      ).toBeNull();
    });

    it('should return token if valid', () => {
      expect(
        guard.extractToken({
          headers: { Authorization: 'Bearer mytoken' },
        } as any),
      ).toBe('mytoken');
    });
  });

  describe('getSecretName', () => {
    it('should return correct secret name', () => {
      expect(guard.getSecretName()).toBe(`${TokenType.ACCESS_TOKEN}_SECRET`);
    });
  });
});
