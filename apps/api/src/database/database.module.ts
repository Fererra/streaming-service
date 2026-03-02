import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersRepository } from './repositories/users.repository';
import { UserEntity } from './entities/user.entity';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import {
  COUNTRY_REPOSITORY,
  CREDITS_REPOSITORY,
  GATEWAY_CUSTOMER_REPOSITORY,
  GATEWAY_PRICE_REPOSITORY,
  GATEWAY_PRODUCT_REPOSITORY,
  GENRES_REPOSITORY,
  MOVIE_CREDITS_REPOSITORY,
  MOVIES_REPOSITORY,
  PERSONS_REPOSITORY,
  REFRESH_TOKEN_REPOSITORY,
  SUBSCRIPTION_OFFER_REPOSITORY,
  SUBSCRIPTION_PLAN_REPOSITORY,
  UPLOAD_INTENTS_REPOSITORY,
  USERS_REPOSITORY,
} from './repositories/tokens/repository.tokens';
import { CountryEntity } from './entities/country.entity';
import { CountryRepository } from './repositories/country.repository';
import { GenreEntity } from './entities/genre.entity';
import { CreditRoleEntity } from './entities/credit-role.entity';
import { PersonEntity } from './entities/person.entity';
import { PersonsRepository } from './repositories/persons.repository';
import { GenresRepository } from './repositories/genres.repository';
import { CreditsRepository } from './repositories/credits.repository';
import { MoviesRepository } from './repositories/movies.repository';
import { MovieEntity } from './entities/movie.entity';
import { MovieCreditEntity } from './entities/movie-credit.entity';
import { MovieCreditsRepository } from './repositories/movie-credits.repository';
import { UploadIntentEntity } from './entities/upload-intent.entity';
import { UploadIntentsRepository } from './repositories/upload-intents.repository';
import { SubscriptionPlanEntity } from './entities/subscription-plan.entity';
import { SubscriptionOfferEntity } from './entities/subscription-offer.entity';
import { SubscriptionPlanRepository } from './repositories/subscription-plan.repository';
import { SubscriptionOfferRepository } from './repositories/subscription-offer.repository';
import { SubscriptionOfferGatewayPriceEntity } from './entities/gateway-price.entity';
import { GatewayPriceRepository } from './repositories/gateway-price.repository';
import { UserGatewayCustomerEntity } from './entities/gateway-customer.entity';
import { GatewayCustomerRepository } from './repositories/gateway-customer.repository';
import { databaseConfig } from '@app/config';
import { SubscriptionPlanGatewayProductEntity } from './entities/gateway-product.entity';
import { GatewayProductRepository } from './repositories/gateway-product.repository';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: async () => ({
        ...databaseConfig(),
      }),
    }),
    TypeOrmModule.forFeature([
      UserEntity,
      RefreshTokenEntity,
      CountryEntity,
      GenreEntity,
      CreditRoleEntity,
      PersonEntity,
      MovieEntity,
      MovieCreditEntity,
      UploadIntentEntity,
      SubscriptionPlanEntity,
      SubscriptionOfferEntity,
      SubscriptionPlanGatewayProductEntity,
      SubscriptionOfferGatewayPriceEntity,
      UserGatewayCustomerEntity,
    ]),
  ],
  providers: [
    { provide: USERS_REPOSITORY, useClass: UsersRepository },
    { provide: REFRESH_TOKEN_REPOSITORY, useClass: RefreshTokenRepository },
    { provide: COUNTRY_REPOSITORY, useClass: CountryRepository },
    { provide: GENRES_REPOSITORY, useClass: GenresRepository },
    { provide: CREDITS_REPOSITORY, useClass: CreditsRepository },
    { provide: PERSONS_REPOSITORY, useClass: PersonsRepository },
    { provide: MOVIES_REPOSITORY, useClass: MoviesRepository },
    { provide: MOVIE_CREDITS_REPOSITORY, useClass: MovieCreditsRepository },
    { provide: UPLOAD_INTENTS_REPOSITORY, useClass: UploadIntentsRepository },
    {
      provide: SUBSCRIPTION_PLAN_REPOSITORY,
      useClass: SubscriptionPlanRepository,
    },
    {
      provide: SUBSCRIPTION_OFFER_REPOSITORY,
      useClass: SubscriptionOfferRepository,
    },
    { provide: GATEWAY_PRICE_REPOSITORY, useClass: GatewayPriceRepository },
    {
      provide: GATEWAY_CUSTOMER_REPOSITORY,
      useClass: GatewayCustomerRepository,
    },
    {
      provide: GATEWAY_PRODUCT_REPOSITORY,
      useClass: GatewayProductRepository,
    },
  ],
  exports: [
    USERS_REPOSITORY,
    REFRESH_TOKEN_REPOSITORY,
    COUNTRY_REPOSITORY,
    GENRES_REPOSITORY,
    CREDITS_REPOSITORY,
    PERSONS_REPOSITORY,
    MOVIES_REPOSITORY,
    MOVIE_CREDITS_REPOSITORY,
    UPLOAD_INTENTS_REPOSITORY,
    SUBSCRIPTION_PLAN_REPOSITORY,
    SUBSCRIPTION_OFFER_REPOSITORY,
    GATEWAY_PRICE_REPOSITORY,
    GATEWAY_CUSTOMER_REPOSITORY,
    GATEWAY_PRODUCT_REPOSITORY,
  ],
})
export class DatabaseModule {}
