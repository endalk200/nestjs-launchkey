import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { addMinutesToCurrentTime, safeAwait } from "src/utils";
import { IEnvironmentVariables } from "src/environmentVariables";
import { ConfigService } from "@nestjs/config";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class BaseAuthService {
  protected readonly logger = new Logger(BaseAuthService.name);

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly configService: ConfigService<IEnvironmentVariables>,
  ) {}

  generateRefreshToken(): {
    token: string;
    expiresAt: Date;
  } {
    const token = uuidv4(); // Generate a random secure token
    const refreshTokenExpiresAt = addMinutesToCurrentTime(
      this.configService.get<number>("REFRESH_TOKEN_EXPIRATION_IN_MINUTES", {
        infer: true,
      })!,
    );

    return { token: token, expiresAt: refreshTokenExpiresAt };
  }

  async issueNewTokens() {
    this.logger.log("some");
  }

  async validateRefreshToken(token: string): Promise<boolean> {
    const [refreshTokenRecord, refreshTokenRecordError] = await safeAwait(
      this.prisma.refreshToken.findUnique({
        where: { token },
      }),
    );
    if (refreshTokenRecordError != null) {
      this.logger.error(`Query RefreshToken record error`, {
        error: refreshTokenRecordError,
      });
    }

    if (!refreshTokenRecord || new Date() > refreshTokenRecord.expiresAt) {
      return false;
    }

    return true;
  }

  async generateAndSaveRefreshToken(data: {
    userId: string;
    deviceId: string;
    deviceName: string;
  }): Promise<string> {
    const { token, expiresAt } = this.generateRefreshToken();

    this.logger.warn("ExpiresAt:", expiresAt.toISOString());

    // TODO: Wrap by safeAwait and handle error properly
    await this.prisma.refreshToken.create({
      data: {
        userId: data.userId,
        token: token,
        expiresAt: expiresAt,
        deviceId: data.deviceId,
        deviceName: data.deviceName,
      },
    });

    return token;
  }

  async revokeRefreshTokenByToken(token: string): Promise<(boolean | Error)[]> {
    const [, revokeRefreshTokenError] = await safeAwait(
      this.prisma.refreshToken.delete({
        where: { token: token },
      }),
    );
    if (revokeRefreshTokenError != null) {
      this.logger.error(`Delete [RefreshToken] record error`, {
        error: revokeRefreshTokenError,
      });

      return [false, revokeRefreshTokenError];
    }

    return [true, null];
  }

  async revokeRefreshTokenByTokenId(
    tokenId: string,
  ): Promise<(boolean | Error)[]> {
    const [, revokeRefreshTokenError] = await safeAwait(
      this.prisma.refreshToken.delete({
        where: { id: tokenId },
      }),
    );
    if (revokeRefreshTokenError != null) {
      this.logger.error(`Delete [RefreshToken] record error`, {
        error: revokeRefreshTokenError,
      });

      return [false, revokeRefreshTokenError];
    }

    return [true, null];
  }
  async revokeRefreshTokenByTokenAndUserId(
    userId: string,
    tokenId: string,
  ): Promise<(boolean | Error)[]> {
    const [, revokeRefreshTokenError] = await safeAwait(
      this.prisma.refreshToken.delete({
        where: { id: tokenId, user: { id: userId } },
      }),
    );
    if (revokeRefreshTokenError != null) {
      this.logger.error(`Delete [RefreshToken] record error`, {
        error: revokeRefreshTokenError,
      });

      return [false, revokeRefreshTokenError];
    }

    return [true, null];
  }

  async revokeRefreshTokenByUserAndDeviceId(
    userId: string,
    deviceId: string,
  ): Promise<(boolean | Error)[]> {
    const [, revokeRefreshTokenError] = await safeAwait(
      this.prisma.refreshToken.delete({
        where: {
          user: { id: userId },
          deviceId: deviceId,
        },
      }),
    );
    if (revokeRefreshTokenError != null) {
      this.logger.error(`Delete RefreshToken record error`, {
        error: revokeRefreshTokenError,
      });

      return [false, revokeRefreshTokenError];
    }

    return [true, null];
  }
}
