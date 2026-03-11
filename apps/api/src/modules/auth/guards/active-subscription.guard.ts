import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { UserSubscriptionApiService } from '../../subscription/services/user-subscription-api.service';

@Injectable()
export class ActiveSubscriptionGuard implements CanActivate {
  constructor(
    private readonly userSubscriptionService: UserSubscriptionApiService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { user } = context.switchToHttp().getRequest();

    const hasActive = await this.userSubscriptionService.hasActiveSubscription(
      user.sub,
    );

    if (!hasActive) {
      throw new ForbiddenException(
        'An active subscription is required to access this resource',
      );
    }

    return true;
  }
}
