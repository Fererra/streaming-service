import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CurrentUserId } from 'src/common/decorators/current-user-id.decorator';

@Controller()
@UseGuards(JwtGuard)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('checkout')
  createCheckout(
    @CurrentUserId() userId: string,
    @Body() dto: CreateCheckoutDto,
  ) {
    return this.paymentService.createCheckoutSession(userId, dto);
  }
}
