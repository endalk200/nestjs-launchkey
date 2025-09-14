import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { userContract } from "./contracts/users.contract";
import { TsRestException } from "@ts-rest/nest";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { PasswordService } from "../auth/base/password.service";
import { safeAwait } from "../utils/safe-await";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { UserCreatedEvent } from "./events";

@Injectable()
export class UsersService {
  protected readonly logger = new Logger(UsersService.name);

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly passwordService: PasswordService,
    private eventEmitter: EventEmitter2,
  ) {}

  async createUser(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }) {
    const [user, error] = await safeAwait(
      this.prisma.user.create({
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          isEmailVerified: false,
          isActive: false,
          password: await this.passwordService.hash(data.password),
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,

          email: true,
          isEmailVerified: true,
          isActive: true,

          createdAt: true,
          updatedAt: true,
        },
      }),
    );
    if (error != null) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        this.logger.error(`DB operation failure due to unique contraint.`);
        throw new TsRestException(userContract.signup, {
          status: 400,
          body: {
            message: "User has already signed up",
          },
        });
      }

      throw new TsRestException(userContract.signup, {
        status: 500,
        body: {
          message:
            "Something wen't wrong while trying to create a new user record",
        },
      });
    }

    this.logger.debug("Emitting user.created event");
    this.eventEmitter.emit(
      "user.created",
      new UserCreatedEvent(user.id, {
        fullName: `${user.firstName} ${user.lastName}`,
        email: user.email,
      }),
    );

    return user;
  }

  async changeUserInfo(data: {
    userId: string;
    firstName: string;
    lastName: string;
  }) {
    const [updateUserRecord, updateUserRecordError] = await safeAwait(
      this.prisma.user.update({
        where: {
          id: data.userId,
        },
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
        },
      }),
    );
    if (updateUserRecordError != null) {
      this.logger.error(
        `Something went wrong while updating user information. ERROR: ${JSON.stringify(updateUserRecordError)}`,
      );
      throw new TsRestException(userContract.changeUserInfo, {
        status: 500,
        body: {
          message:
            "Something went wrong while trying to update user information",
        },
      });
    }

    return {
      id: updateUserRecord.id,
      firstName: updateUserRecord.firstName,
      lastName: updateUserRecord.lastName,
      email: updateUserRecord.email,
    };
  }
}
