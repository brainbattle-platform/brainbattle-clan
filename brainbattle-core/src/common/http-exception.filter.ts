import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = exception instanceof HttpException ? exception.getResponse() : null;

    let code = 'internal_error';
    let message = 'Internal server error';
    let details: any = undefined;

    if (exceptionResponse && typeof exceptionResponse === 'object') {
      const res: any = exceptionResponse as any;
      message = res.message || res.error || message;
      code = res.code || res.error || code;
      details = res.details;
    } else if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
      code = exceptionResponse;
    } else if (exception?.message) {
      message = exception.message;
    }

    response.status(status).json({
      error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
    });
  }
}
