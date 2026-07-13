import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { DecodedToken } from '@clinicengage/types';

export const ClinicId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.clinicId;
  },
);

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): DecodedToken => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
