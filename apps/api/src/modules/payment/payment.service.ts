import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PAYMENT_GATEWAY } from './payment.tokens';
import type { PaymentGateway } from './interfaces/payment-gateway.interface';
import {
  GATEWAY_CUSTOMER_REPOSITORY,
  GATEWAY_PRICE_REPOSITORY,
} from '../../database/repositories/tokens/repository.tokens';
import {
  type IPaymentRepository,
  PAYMENT_REPOSITORY,
  PaymentStatus,
  PaymentGatewayProvider,
  PAYMENT_QUEUE_SERVICE,
  type IPaymentQueueService,
} from '@app/payment';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { UsersService } from '../users/services/users.service';
import { SubscriptionOfferEntity } from '../../database/entities/subscription-offer.entity';
import type { IGatewayPriceRepository } from '../../database/repositories/interfaces/gateway-price-repository.interface';
import type { IGatewayCustomerRepository } from '../../database/repositories/interfaces/gateway-customer.repository';

@Injectable()
export class PaymentService {
  constructor(
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: PaymentGateway,
    @Inject(PAYMENT_REPOSITORY)
    private readonly paymentRepository: IPaymentRepository,
    @Inject(GATEWAY_PRICE_REPOSITORY)
    private readonly gatewayPriceRepository: IGatewayPriceRepository,
    @Inject(GATEWAY_CUSTOMER_REPOSITORY)
    private readonly gatewayCustomerRepository: IGatewayCustomerRepository,
    @Inject(PAYMENT_QUEUE_SERVICE)
    private readonly paymentQueueService: IPaymentQueueService,
    private readonly usersService: UsersService,
  ) {}

  async syncOfferToGateway(offer: SubscriptionOfferEntity) {
    const { id: externalPriceId } = await this.paymentGateway.createPrice({
      id: offer.id,
      planName: offer.subscriptionPlan.name,
      amount: offer.price,
      durationMonths: offer.durationMonths,
      currency: 'USD',
    });

    await this.gatewayPriceRepository.createGatewayPrice(
      this.paymentGateway.gateway,
      externalPriceId,
      offer.id,
    );
  }

  async createCheckoutSession(userId: string, dto: CreateCheckoutDto) {
    const userEmail = await this.usersService.findUserEmailById(userId);

    if (!userEmail) {
      throw new NotFoundException('User email not found');
    }

    const gatewayOffer =
      await this.gatewayPriceRepository.findByOfferIdAndGateway(
        dto.offerId,
        this.paymentGateway.gateway,
      );

    if (!gatewayOffer) {
      throw new NotFoundException('Subscription offer not found');
    }

    const customerId = await this.resolveCustomerId(userId, userEmail);

    const checkoutResponse = await this.paymentGateway.createCheckoutSession({
      userId,
      email: userEmail,
      externalCustomerId: customerId,
      offerId: dto.offerId,
      externalPriceId: gatewayOffer.externalPriceId,
    });

    await this.paymentRepository.create({
      userId,
      subscriptionOfferId: dto.offerId,
      externalSessionId: checkoutResponse.sessionId,
      status: PaymentStatus.PENDING,
      amount: Number(gatewayOffer.offer.price),
      currency: dto.currency ?? 'USD',
      gateway: PaymentGatewayProvider.STRIPE,
    });

    return { checkoutUrl: checkoutResponse.checkoutUrl };
  }

  private async resolveCustomerId(
    userId: string,
    email: string,
  ): Promise<string> {
    const gatewayCustomer =
      await this.gatewayCustomerRepository.findByUserIdAndGateway(
        userId,
        this.paymentGateway.gateway,
      );

    if (gatewayCustomer) return gatewayCustomer.externalCustomerId;

    const { id: newCustomerId } = await this.paymentGateway.createCustomer({
      email,
      userId,
    });

    await this.gatewayCustomerRepository.save({
      user: { id: userId } as any,
      gateway: this.paymentGateway.gateway,
      externalCustomerId: newCustomerId,
    });

    return newCustomerId;
  }

  async handleWebhookEvent(payload: Buffer, signature: string): Promise<void> {
    const event = await this.paymentGateway.constructWebhookEvent(
      payload,
      signature,
    );

    await this.paymentQueueService.dispatchEvent(event.type, event);
  }
}
