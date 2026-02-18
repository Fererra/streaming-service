import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PAYMENT_GATEWAY, WEBHOOK_EVENT_HANDLERS } from './payment.tokens';
import type { PaymentGateway } from './interfaces/payment-gateway.interface';
import type { WebhookEventResult } from './interfaces/payment-gateway.interface';
import type { WebhookEventHandler } from './interfaces/webhook-event-handler.interface';
import type { IPaymentRepository } from 'src/database/repositories/interfaces/payment-repository.interface';
import {
  GATEWAY_CUSTOMER_REPOSITORY,
  GATEWAY_PRICE_REPOSITORY,
  PAYMENT_REPOSITORY,
} from 'src/database/repositories/tokens/repository.tokens';
import { PaymentStatus } from './enums/payment-status.enum';
import { PaymentGatewayProvider } from './enums/payment-gateway-provider.enum';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { UsersService } from '../users/services/users.service';
import { SubscriptionOfferEntity } from 'src/database/entities/subscription-offer.entity';
import type { IGatewayPriceRepository } from 'src/database/repositories/interfaces/gateway-price-repository.interface';
import type { IGatewayCustomerRepository } from 'src/database/repositories/interfaces/gateway-customer.repository';

@Injectable()
export class PaymentService {
  private readonly handlerMap: Map<
    WebhookEventResult['type'],
    WebhookEventHandler
  >;

  constructor(
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: PaymentGateway,
    @Inject(PAYMENT_REPOSITORY)
    private readonly paymentRepository: IPaymentRepository,
    @Inject(GATEWAY_PRICE_REPOSITORY)
    private readonly gatewayPriceRepository: IGatewayPriceRepository,
    @Inject(GATEWAY_CUSTOMER_REPOSITORY)
    private readonly gatewayCustomerRepository: IGatewayCustomerRepository,
    @Inject(WEBHOOK_EVENT_HANDLERS)
    private readonly webhookEventHandlers: WebhookEventHandler[],
    private readonly usersService: UsersService,
  ) {
    this.handlerMap = new Map(
      this.webhookEventHandlers.map((h) => [h.eventType, h]),
    );
  }

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
      externalSessionId: checkoutResponse.sessionId,
      status: PaymentStatus.PENDING,
      amount: Number(gatewayOffer.offer.price),
      currency: dto.currency ?? 'USD',
      gateway: PaymentGatewayProvider.STRIPE,
      user: { id: userId } as any,
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

    const handler = this.handlerMap.get(event.type);

    if (handler) {
      await handler.handle(event);
    }
  }
}
