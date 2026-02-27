import { Money } from '../../src/modules/subscription/helper/money';

describe('Money', () => {
  describe('fromMajor', () => {
    it('should create Money from major currency units', () => {
      const money = Money.fromMajor(9.99);

      expect(money.value).toBe(999);
    });

    it('should handle whole numbers', () => {
      const money = Money.fromMajor(10);

      expect(money.value).toBe(1000);
    });

    it('should round floating point edge cases', () => {
      const money = Money.fromMajor(19.99);

      expect(money.value).toBe(1999);
    });

    it('should handle zero', () => {
      const money = Money.fromMajor(0);

      expect(money.value).toBe(0);
    });

    it('should throw error for Infinity', () => {
      expect(() => Money.fromMajor(Infinity)).toThrow('Invalid money value');
    });

    it('should throw error for -Infinity', () => {
      expect(() => Money.fromMajor(-Infinity)).toThrow('Invalid money value');
    });

    it('should throw error for NaN', () => {
      expect(() => Money.fromMajor(NaN)).toThrow('Invalid money value');
    });
  });

  describe('fromCents', () => {
    it('should create Money from cents', () => {
      const money = Money.fromCents(999);

      expect(money.value).toBe(999);
    });

    it('should handle zero cents', () => {
      const money = Money.fromCents(0);

      expect(money.value).toBe(0);
    });

    it('should throw error for non-integer cents', () => {
      expect(() => Money.fromCents(9.99)).toThrow(
        'Money must be integer cents',
      );
    });
  });

  describe('toString', () => {
    it('should format cents as major currency string', () => {
      const money = Money.fromCents(999);

      expect(money.toString()).toBe('9.99');
    });

    it('should format with two decimal places', () => {
      const money = Money.fromCents(1000);

      expect(money.toString()).toBe('10.00');
    });

    it('should format zero correctly', () => {
      const money = Money.fromCents(0);

      expect(money.toString()).toBe('0.00');
    });

    it('should format single digit cents', () => {
      const money = Money.fromCents(5);

      expect(money.toString()).toBe('0.05');
    });
  });

  describe('value', () => {
    it('should return the cents value', () => {
      const money = Money.fromCents(1499);

      expect(money.value).toBe(1499);
    });
  });
});
