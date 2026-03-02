import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PAYMENT_GATEWAY } from './payment.tokens';
import type { PaymentGateway } from './interfaces/payment-gateway.interface';
import {
  GATEWAY_CUSTOMER_REPOSITORY,
  GATEWAY_PRICE_REPOSITORY,
  GATEWAY_PRODUCT_REPOSITORY,
} from '../../database/repositories/tokens/repository.tokens';
import {
  type IPaymentRepository,
  PAYMENT_REPOSITORY,
  PaymentStatus,
  PAYMENT_QUEUE_SERVICE,
  type IPaymentQueueService,
} from '@app/payment';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { UsersService } from '../users/services/users.service';
import { SubscriptionOfferEntity } from '../../database/entities/subscription-offer.entity';
import type { IGatewayPriceRepository } from '../../database/repositories/interfaces/gateway-price-repository.interface';
import type { IGatewayCustomerRepository } from '../../database/repositories/interfaces/gateway-customer.repository';
import { SubscriptionPlanEntity } from '../../database/entities/subscription-plan.entity';
import type { IGatewayProductRepository } from '../../database/repositories/interfaces/gateway-product-repository.interface';

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
    @Inject(GATEWAY_PRODUCT_REPOSITORY)
    private readonly gatewayProductRepository: IGatewayProductRepository,
    private readonly usersService: UsersService,
  ) {}

  async createProductInGateway(plan: SubscriptionPlanEntity) {
    const product = await this.paymentGateway.createProduct({
      id: plan.id,
      name: plan.name,
      description: plan.description,
    });

    await this.gatewayProductRepository.createGatewayProduct(
      this.paymentGateway.gateway,
      product.id,
      plan.id,
    );

    return product;
  }

  async updateProductInGateway(
    planId: string,
    updateSubscriptionDto: Partial<SubscriptionPlanEntity>,
  ) {
    const productId =
      await this.gatewayProductRepository.findByPlanIdAndGateway(
        planId,
        this.paymentGateway.gateway,
      );

    if (!productId) {
      throw new NotFoundException('Product not found in gateway');
    }

    await this.paymentGateway.updateProduct(productId, {
      name: updateSubscriptionDto.name,
      description: updateSubscriptionDto.description,
    });
  }

  async syncOfferToGateway(offer: SubscriptionOfferEntity) {
    const productId =
      await this.gatewayProductRepository.findByPlanIdAndGateway(
        offer.subscriptionPlan.id,
        this.paymentGateway.gateway,
      );

    if (!productId) {
      throw new InternalServerErrorException('Plan is not synced to gateway');
    }

    const { id: externalPriceId } = await this.paymentGateway.createPrice(
      {
        id: offer.id,
        amount: offer.price,
        durationMonths: offer.durationMonths,
        currency: 'USD',
      },
      productId,
    );

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
      amount: Number(gatewayOffer.offer.price) * 100,
      currency: dto.currency ?? 'USD',
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
