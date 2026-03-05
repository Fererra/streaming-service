import { CommandPayload, CommandType } from '@app/payment';
import { Injectable } from '@nestjs/common';
import { PaymentCommandService } from '../../services/payment-command.service';

export interface JobContext {
  jobId: string;
}

type HandlerMap = {
  [K in CommandType]: (
    payload: CommandPayload<K>,
    context: JobContext,
  ) => Promise<void>;
};

@Injectable()
export class PaymentCommandHandlersRegistry {
  private readonly map: Map<CommandType, HandlerMap[CommandType]>;

  constructor(private readonly paymentGatewayService: PaymentCommandService) {
    const handlers: HandlerMap = {
      'command.syncPlan': async (p, ctx) => {
        await this.paymentGatewayService.createProductInGateway(p, ctx.jobId);
      },

      'command.updatePlan': async (p, ctx) => {
        await this.paymentGatewayService.updateProductInGateway(
          p.planId,
          p.updates,
          ctx.jobId,
        );
      },

      'command.activatePlan': async (p, ctx) => {
        await this.paymentGatewayService.activateProductInGateway(
          p.planId,
          ctx.jobId,
        );
      },

      'command.deactivatePlan': async (p, ctx) => {
        await this.paymentGatewayService.deactivateProductInGateway(
          p.planId,
          ctx.jobId,
        );
      },

      'command.syncOffer': async (p, ctx) => {
        await this.paymentGatewayService.syncOfferToGateway(p, ctx.jobId);
      },

      'command.deactivateOffer': async (p, ctx) => {
        await this.paymentGatewayService.deactivateOfferInGateway(
          p.offerId,
          ctx.jobId,
        );
      },

      'command.deactivateSubscription': async (p, ctx) => {
        await this.paymentGatewayService.deactivateSubscriptionInGateway(
          p.subscriptionId,
          p.initiator,
          ctx.jobId,
        );
      },
    };

    this.map = new Map(
      Object.entries(handlers) as [CommandType, HandlerMap[CommandType]][],
    );
  }

  get<T extends CommandType>(type: T) {
    const handler = this.map.get(type);

    if (!handler) throw new Error(`No handler for ${type}`);

    return handler as (
      payload: CommandPayload<T>,
      context: JobContext,
    ) => Promise<void>;
  }
}
