export class Money {
  private constructor(private readonly cents: number) {}

  static fromMajor(amount: number): Money {
    if (!Number.isFinite(amount)) {
      throw new Error('Invalid money value');
    }

    const cents = Math.round(amount * 100);

    return new Money(cents);
  }

  static fromCents(cents: number): Money {
    if (!Number.isInteger(cents)) {
      throw new Error('Money must be integer cents');
    }
    return new Money(cents);
  }

  toString(): string {
    return (this.cents / 100).toFixed(2);
  }

  get value(): number {
    return this.cents;
  }
}
