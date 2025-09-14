import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { UserCreatedEvent } from "./events";
import { AuthService } from "src/auth/auth.service";

@Injectable()
export class UserEventListener {
  private readonly logger = new Logger(UserEventListener.name);

  constructor(private readonly authService: AuthService) {}

  @OnEvent("user.created", { async: true })
  async userCreatedEventHandler(event: UserCreatedEvent) {
    this.logger.debug(`User created event: ${event.userId}`);
    await this.authService.sendEmailVerificationCode({
      email: event.payload.email,
    });
  }
}
