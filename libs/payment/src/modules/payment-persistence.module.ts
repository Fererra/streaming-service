import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentEntity } from '../entities/payment.entity';
import {
  GATEWAY_CUSTOMER_REPOSITORY,
  GATEWAY_PRICE_REPOSITORY,
  GATEWAY_PRODUCT_REPOSITORY,
  PAYMENT_REPOSITORY,
} from '../constants/constants';
import { PaymentRepository } from '../repositories/payment.repository';
import { SubscriptionOfferGatewayPriceEntity } from '../entities/gateway-price.entity';
import { SubscriptionPlanGatewayProductEntity } from '../entities/gateway-product.entity';
import { UserGatewayCustomerEntity } from '../entities/gateway-customer.entity';
import { GatewayCustomerRepository } from '../repositories/gateway-customer.repository';
import { GatewayPriceRepository } from '../repositories/gateway-price.repository';
import { GatewayProductRepository } from '../repositories/gateway-product.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PaymentEntity,
      UserGatewayCustomerEntity,
      SubscriptionPlanGatewayProductEntity,
      SubscriptionOfferGatewayPriceEntity,
    ]),
  ],
  providers: [
    { provide: PAYMENT_REPOSITORY, useClass: PaymentRepository },
    {
      provide: GATEWAY_CUSTOMER_REPOSITORY,
      useClass: GatewayCustomerRepository,
    },
    {
      provide: GATEWAY_PRODUCT_REPOSITORY,
      useClass: GatewayProductRepository,
    },
    {
      provide: GATEWAY_PRICE_REPOSITORY,
      useClass: GatewayPriceRepository,
    },
  ],
  exports: [
    TypeOrmModule,
    PAYMENT_REPOSITORY,
    GATEWAY_CUSTOMER_REPOSITORY,
    GATEWAY_PRODUCT_REPOSITORY,
    GATEWAY_PRICE_REPOSITORY,
  ],
})
export class PaymentPersistenceModule {}
