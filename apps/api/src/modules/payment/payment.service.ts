import {
  PAYMENT_GATEWAY,
  PAYMENT_REPOSITORY,
  type IPaymentRepository,
  GATEWAY_PRICE_REPOSITORY,
  GATEWAY_CUSTOMER_REPOSITORY,
  PAYMENT_QUEUE_SERVICE,
  type IPaymentQueueService,
  USER_RESOLVER,
  SUBSCRIPTION_OFFER_RESOLVER,
  PaymentStatus,
  type PaymentGateway,
  CreateCheckoutRequest,
  type IGatewayCustomerRepository,
  type IGatewayPriceRepository,
  type ISubscriptionOfferResolver,
  type IUserResolver,
} from '@app/payment';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';

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
    @Inject(USER_RESOLVER)
    private readonly usersService: IUserResolver,
    @Inject(SUBSCRIPTION_OFFER_RESOLVER)
    private readonly subscriptionOfferResolver: ISubscriptionOfferResolver,
  ) {}

  async createCheckoutSession(userId: string, options: CreateCheckoutRequest) {
    const userEmail = await this.usersService.findEmailById(userId);

    if (!userEmail) {
      throw new NotFoundException('User email not found');
    }

    const [gatewayPrice, offerPrice] = await Promise.all([
      this.gatewayPriceRepository.findByOfferIdAndGateway(
        options.offerId,
        this.paymentGateway.gateway,
      ),
      this.subscriptionOfferResolver.findPriceById(options.offerId),
    ]);

    if (!gatewayPrice || !offerPrice)
      throw new NotFoundException('Subscription offer not found');

    const customerId = await this.resolveCustomerId(userId, userEmail);

    const checkoutResponse = await this.paymentGateway.createCheckoutSession({
      userId,
      email: userEmail,
      externalCustomerId: customerId,
      offerId: options.offerId,
      externalPriceId: gatewayPrice.externalPriceId,
    });

    await this.paymentRepository.create({
      userId,
      subscriptionOfferId: options.offerId,
      externalSessionId: checkoutResponse.sessionId,
      status: PaymentStatus.PENDING,
      amount: Number(offerPrice) * 100,
      currency: options.currency ?? 'USD',
      gateway: this.paymentGateway.gateway,
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

    const idempotencyKey = `create-customer-${userId}-${Date.now()}`;

    const { id: newCustomerId } = await this.paymentGateway.createCustomer(
      {
        email,
        userId,
      },
      idempotencyKey,
    );

    await this.gatewayCustomerRepository.save({
      userId,
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

    if (!event) return;

    await this.paymentQueueService.dispatchEvent(event.type, event);
  }
}
