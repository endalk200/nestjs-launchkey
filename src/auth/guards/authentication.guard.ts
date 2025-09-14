import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import {
  JsonWebTokenError,
  JwtService,
  NotBeforeError,
  TokenExpiredError,
} from "@nestjs/jwt";
import { Request } from "express";
import { safeAwait } from "src/utils/safe-await";
import { JWTPayload } from "../auth.service";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

@Injectable()
export class AuthenticationGuard implements CanActivate {
  private readonly logger = new Logger(AuthenticationGuard.name);

  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      // 💡 See this condition
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException();
    }
    try {
      const [payload, error] = await safeAwait(
        this.jwtService.verifyAsync<JWTPayload>(token),
      );
      if (error != null) {
        if (error instanceof TokenExpiredError) {
          this.logger.error("Token is expired");
        } else if (error instanceof JsonWebTokenError) {
          this.logger.error("Invalid token");
        } else if (error instanceof NotBeforeError) {
          this.logger.error("Token is not active");
        } else {
          this.logger.error("Failed to verify token");
        }
      }
      request["user"] = {
        id: payload.sub,
        role: payload.role,
      };
    } catch {
      throw new UnauthorizedException();
    }
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(" ") ?? [];

    return type === "Bearer" ? token : undefined;
  }
}
