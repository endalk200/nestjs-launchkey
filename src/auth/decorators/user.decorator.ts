import { createParamDecorator, ExecutionContext } from "@nestjs/common";

/**
 * Exxtract user from request
 * */
export const User = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();

    console.log(data); // Parameter
    return {
      id: request.user.sub,
      role: request.user.role,
    };
  },
);
