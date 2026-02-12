import {
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  RawBody,
} from '@nestjs/common';
import { PaymentService } from './payment.service';

@Controller('webhook')
export class WebhookController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @RawBody() payload: Buffer,
    @Headers('stripe-signature') signature: string,
  ) {
    await this.paymentService.handleWebhookEvent(payload, signature);
    return { received: true };
  }
}
