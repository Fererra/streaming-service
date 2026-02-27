import { OfferEntityFactory } from '../../src/modules/subscription/factories/offer-entity.factory';
import { CreateOfferDto } from '../../src/modules/subscription/dto/create-subscription.dto';

describe('OfferEntityFactory', () => {
  let factory: OfferEntityFactory;

  beforeEach(() => {
    factory = new OfferEntityFactory();
  });

  describe('createFromDto', () => {
    it('should create offer entities from DTO without subscriptionPlanId', () => {
      const offers: CreateOfferDto[] = [
        { durationMonths: 1, price: 999 },
        { durationMonths: 6, price: 4999 },
      ];

      const result = factory.createFromDto(offers);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        durationMonths: 1,
        price: 999,
      });
      expect(result[1]).toEqual({
        durationMonths: 6,
        price: 4999,
      });
    });

    it('should create offer entities from DTO with subscriptionPlanId', () => {
      const offers: CreateOfferDto[] = [{ durationMonths: 12, price: 8999 }];

      const result = factory.createFromDto(offers, 'plan-123');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        durationMonths: 12,
        price: 8999,
        subscriptionPlan: { id: 'plan-123' },
      });
    });

    it('should handle multiple offers with subscriptionPlanId', () => {
      const offers: CreateOfferDto[] = [
        { durationMonths: 1, price: 999 },
        { durationMonths: 3, price: 2499 },
        { durationMonths: 12, price: 8999 },
      ];

      const result = factory.createFromDto(offers, 'plan-456');

      expect(result).toHaveLength(3);
      result.forEach((offer) => {
        expect(offer.subscriptionPlan?.id).toBe('plan-456');
      });
      expect(result[0].durationMonths).toBe(1);
      expect(result[0].price).toBe(999);
      expect(result[1].durationMonths).toBe(3);
      expect(result[1].price).toBe(2499);
      expect(result[2].durationMonths).toBe(12);
      expect(result[2].price).toBe(8999);
    });

    it('should return empty array for empty offers', () => {
      const result = factory.createFromDto([]);

      expect(result).toEqual([]);
    });

    it('should not include subscriptionPlan when subscriptionPlanId is undefined', () => {
      const offers: CreateOfferDto[] = [{ durationMonths: 1, price: 500 }];

      const result = factory.createFromDto(offers, undefined);

      expect(result[0]).toEqual({
        durationMonths: 1,
        price: 500,
      });
      expect(result[0]).not.toHaveProperty('subscriptionPlan');
    });

    it('should pass through price values as-is', () => {
      const offers: CreateOfferDto[] = [
        { durationMonths: 1, price: 1050 },
        { durationMonths: 3, price: 2599 },
        { durationMonths: 12, price: 10000 },
      ];

      const result = factory.createFromDto(offers);

      expect(result[0].price).toBe(1050);
      expect(result[1].price).toBe(2599);
      expect(result[2].price).toBe(10000);
    });

    it('should handle zero price', () => {
      const offers: CreateOfferDto[] = [{ durationMonths: 1, price: 0 }];

      const result = factory.createFromDto(offers);

      expect(result[0].price).toBe(0);
    });
  });
});
