import { OfferEntityFactory } from 'src/modules/subscription/factories/offer-entity.factory';
import { CreateOfferDto } from 'src/modules/subscription/dto/create-subscription.dto';

describe('OfferEntityFactory', () => {
  let factory: OfferEntityFactory;

  beforeEach(() => {
    factory = new OfferEntityFactory();
  });

  describe('createFromDto', () => {
    it('should create offer entities from DTO without subscriptionPlanId', () => {
      const offers: CreateOfferDto[] = [
        { durationMonths: 1, price: 9.99 },
        { durationMonths: 6, price: 49.99 },
      ];

      const result = factory.createFromDto(offers);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        durationMonths: 1,
        price: 9.99,
      });
      expect(result[1]).toEqual({
        durationMonths: 6,
        price: 49.99,
      });
    });

    it('should create offer entities from DTO with subscriptionPlanId', () => {
      const offers: CreateOfferDto[] = [{ durationMonths: 12, price: 89.99 }];

      const result = factory.createFromDto(offers, 'plan-123');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        durationMonths: 12,
        price: 89.99,
        subscriptionPlan: { id: 'plan-123' },
      });
    });

    it('should handle multiple offers with subscriptionPlanId', () => {
      const offers: CreateOfferDto[] = [
        { durationMonths: 1, price: 9.99 },
        { durationMonths: 3, price: 24.99 },
        { durationMonths: 12, price: 89.99 },
      ];

      const result = factory.createFromDto(offers, 'plan-456');

      expect(result).toHaveLength(3);
      result.forEach((offer) => {
        expect(offer.subscriptionPlan?.id).toBe('plan-456');
      });
      expect(result[0].durationMonths).toBe(1);
      expect(result[1].durationMonths).toBe(3);
      expect(result[2].durationMonths).toBe(12);
    });

    it('should return empty array for empty offers', () => {
      const result = factory.createFromDto([]);

      expect(result).toEqual([]);
    });

    it('should not include subscriptionPlan when subscriptionPlanId is undefined', () => {
      const offers: CreateOfferDto[] = [{ durationMonths: 1, price: 5.0 }];

      const result = factory.createFromDto(offers, undefined);

      expect(result[0]).toEqual({
        durationMonths: 1,
        price: 5.0,
      });
      expect(result[0]).not.toHaveProperty('subscriptionPlan');
    });
  });
});
