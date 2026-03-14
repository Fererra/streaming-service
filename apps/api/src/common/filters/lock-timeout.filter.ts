import { Catch, ExceptionFilter, ArgumentsHost } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';

@Catch(QueryFailedError)
export class LockTimeoutFilter implements ExceptionFilter {
  catch(exception: QueryFailedError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    if ((exception as any).code === '55P03') {
      return response.status(409).json({
        statusCode: 409,
        message: 'Resource is currently being modified, please try again',
        error: 'Conflict',
      });
    }

    throw exception;
  }
}
