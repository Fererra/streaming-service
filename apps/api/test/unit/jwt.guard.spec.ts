import { JwtGuard } from '../../src/modules/auth/guards/jwt.guard';
import { TokenType } from '../../src/modules/token/types/token-types.enum';

describe('JwtGuard', () => {
  let guard: JwtGuard;

  beforeEach(() => {
    guard = new JwtGuard();
  });

  describe('extractToken', () => {
    it('should return null if no header', () => {
      expect(guard.extractToken({ headers: {} } as any)).toBeNull();
    });

    it('should return null if scheme is not Bearer', () => {
      expect(
        guard.extractToken({ headers: { authorization: 'Token abc' } } as any),
      ).toBeNull();
    });

    it('should return null if token is missing', () => {
      expect(
        guard.extractToken({ headers: { authorization: 'Bearer' } } as any),
      ).toBeNull();
    });

    it('should return token if valid', () => {
      expect(
        guard.extractToken({
          headers: { authorization: 'Bearer mytoken' },
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
