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
import {
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

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

    const paymentIntent = await this.paymentRepository.create({
      userId,
      subscriptionOfferId: options.offerId,
      externalSessionId: null,
      status: PaymentStatus.PENDING,
      amount: offerPrice,
      currency: options.currency ?? 'USD',
      gateway: this.paymentGateway.gateway,
    });

    try {
      const checkoutResponse = await this.paymentGateway.createCheckoutSession({
        userId,
        email: userEmail,
        externalCustomerId: customerId,
        offerId: options.offerId,
        externalPriceId: gatewayPrice.externalPriceId,
        internalPaymentId: paymentIntent.id,
      });

      await this.paymentRepository.update(paymentIntent.id, {
        externalSessionId: checkoutResponse.sessionId,
      });

      return { checkoutUrl: checkoutResponse.checkoutUrl };
    } catch (error) {
      console.error(
        `Failed to update payment ${paymentIntent.id} with Stripe session, but session was created.`,
      );

      await this.paymentRepository.update(paymentIntent.id, {
        status: PaymentStatus.FAILED,
      });

      throw new ServiceUnavailableException(
        'Failed to create checkout session. Please try again later.',
      );
    }
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

    const idempotencyKey = `create-customer-${userId}`;

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
