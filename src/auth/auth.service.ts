import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PasswordService } from "./base/password.service";
import { TsRestException } from "@ts-rest/nest";
import { authContract } from "./contracts/auth.contract";
import { safeAwait } from "src/utils/safe-await";
import { JwtService } from "@nestjs/jwt";
import { IEnvironmentVariables } from "src/environmentVariables";
import { ConfigService } from "@nestjs/config";
import { Resend } from "resend";
import { VerificationCodeTemplate } from "src/transactional/emails/email-verification";
import { PasswordResetCodeTemplate } from "src/transactional/emails/password-reset";
import { v4 as uuidv4 } from "uuid";
import { BaseAuthService } from "./base/auth.service.base";
import { addMinutesToCurrentTime, generateSixDigitCode } from "src/utils";

export type JWTPayload = {
  sub: string;
  iss: string;
  aud: string;
  iat: number;
  exp: number;
  role: string;
};

@Injectable()
export class AuthService extends BaseAuthService {
  protected readonly logger = new Logger(AuthService.name);

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly passwordService: PasswordService,
    protected readonly configService: ConfigService<IEnvironmentVariables>,
    protected readonly jwtService: JwtService,
  ) {
    super(prisma, configService);
  }

  async validateUser(data: { email: string; password: string }) {
    const [userRecord, userRecordError] = await safeAwait(
      this.prisma.user.findUniqueOrThrow({
        where: {
          email: data.email,
        },
      }),
    );
    if (userRecordError != null) {
      this.logger.error(`Query User record error`, { error: userRecordError });
      throw new Error("User record with provided email address doesn't exist");
    }

    if (!userRecord.isActive) {
      this.logger.debug(
        `User: isActive: ${userRecord.isActive} isEmailVerified: ${userRecord.isEmailVerified}`,
      );

      throw new Error(
        `The account is not active, ${!userRecord.isEmailVerified ? "Please verify your email address" : "Please contact admin"} to activate your account`,
      );
    }

    if (
      await this.passwordService.compare(data.password, userRecord.password)
    ) {
      return {
        id: userRecord.id,
        email: userRecord.email,
        firstName: userRecord.firstName,
        lastName: userRecord.lastName,
        role: userRecord.role,
      };
    }

    throw new Error(
      "Invalid credentials provided, please try again with correct credentials.",
    );
  }

  async login(data: { email: string; password: string; userAgent: string }) {
    const [userRecord, userRecordError] = await safeAwait(
      this.prisma.user.findUniqueOrThrow({
        where: {
          email: data.email,
        },
      }),
    );
    if (userRecordError != null) {
      this.logger.error(`Query User record error`, { error: userRecordError });
      throw new TsRestException(authContract.login, {
        status: 401,
        body: {
          message: "Unauthorized",
        },
      });
    }

    if (!userRecord.isActive) {
      this.logger.debug(
        `User: isActive: ${userRecord.isActive} isEmailVerified: ${userRecord.isEmailVerified}`,
      );
      throw new TsRestException(authContract.login, {
        status: 423,
        body: {
          message: `The account is not active, ${!userRecord.isEmailVerified ? "Please verify your email address" : "Please contact admin"} to activate your account`,
        },
      });
    }

    if (
      await this.passwordService.compare(data.password, userRecord.password)
    ) {
      const JWT_ISSUER = this.configService.get("JWT_ISSUER", {
        infer: true,
      })!;
      const JWT_AUDIENCE = this.configService.get("JWT_AUDIENCE", {
        infer: true,
      })!;
      const accessTokenExpiresAt = addMinutesToCurrentTime(
        this.configService.get<number>("ACCESS_TOKEN_EXPIRATION_IN_MINUTES", {
          infer: true,
        })!,
      );
      const refreshTokenExpiresAt = addMinutesToCurrentTime(
        this.configService.get<number>("REFRESH_TOKEN_EXPIRATION_IN_MINUTES", {
          infer: true,
        })!,
      );

      const deviceId = uuidv4();
      const deviceName = data.userAgent;

      const payload = {
        sub: userRecord.id,
        iss: JWT_ISSUER,
        aud: JWT_AUDIENCE,
        role: userRecord.role,
      };
      const accessToken = this.jwtService.sign(payload);
      const refreshToken = await this.generateAndSaveRefreshToken({
        userId: userRecord.id,
        deviceId: deviceId,
        deviceName: deviceName,
      });

      return {
        auth: {
          accessToken: accessToken,
          refreshToken: refreshToken,
          deviceId: deviceId,
          deviceName: deviceName,
          accessTokenExpiresIn: accessTokenExpiresAt.getTime(),
          refreshTokenExpiresIn: refreshTokenExpiresAt.getTime(),
        },
        user: userRecord,
      };
    }

    throw new TsRestException(authContract.login, {
      status: 400,
      body: {
        message:
          "Invalid credentials provided, please try again with correct credentials.",
      },
    });
  }

  async sendEmailVerificationCode(data: { email: string }) {
    const [userRecord, userRecordError] = await safeAwait(
      this.prisma.user.findUniqueOrThrow({
        where: {
          email: data.email,
        },
      }),
    );
    if (userRecordError != null) {
      this.logger.error(`Query User record error`, { error: userRecordError });
      throw userRecordError;
    }

    if (userRecord.isEmailVerified) {
      this.logger.error(
        `Account associated with email ${data.email} is already verified`,
      );
      throw new Error(`The email address is already verified`);
    }

    const verificationCode = generateSixDigitCode();
    const expiresAt = addMinutesToCurrentTime(
      this.configService.get("VERIFICATION_CODE_EXPIRATION_IN_MINUTES", {
        infer: true,
      })!,
    );

    const [, verificationRecordError] = await safeAwait(
      this.prisma.emailVerification.create({
        data: {
          userId: userRecord.id,
          code: verificationCode,
          expiresAt: expiresAt,
        },
      }),
    );
    if (verificationRecordError != null) {
      this.logger.error(`Add EmailVerification record error`, {
        error: verificationRecordError,
      });

      throw verificationRecordError;
    }

    const resend = new Resend(
      this.configService.get("RESEND_API_KEY", { infer: true })!,
    );

    resend.emails.send({
      from: this.configService.getOrThrow("FROM_EMAIL", { infer: true })!,
      to: data.email,
      subject: "Verify your email",
      react: VerificationCodeTemplate({
        applicationName: this.configService.get("APPLICATION_NAME", {
          infer: true,
        })!,
        code: verificationCode,
        supportEmail: this.configService.get("SUPPORT_EMAIL", { infer: true })!,
        expirationInMinutes: this.configService
          .get("VERIFICATION_CODE_EXPIRATION_IN_MINUTES", {
            infer: true,
          })!
          .toString(),
      }),
    });
  }

  async reSendEmailVerificationCode(data: { email: string }) {
    const [userRecord, userRecordError] = await safeAwait(
      this.prisma.user.findUniqueOrThrow({
        where: {
          email: data.email,
        },
      }),
    );
    if (userRecordError != null) {
      this.logger.error(`Query User record error`, { error: userRecordError });
      throw new TsRestException(authContract.reSendVerificationCode, {
        status: 404,
        body: {
          message: "Account not found",
        },
      });
    }

    if (userRecord.isEmailVerified) {
      this.logger.error(
        `Account associated with email ${data.email} is already verified`,
      );
      throw new TsRestException(authContract.reSendVerificationCode, {
        status: 400,
        body: {
          message: "The account is already verified",
        },
      });
    }

    const verificationCode = generateSixDigitCode();
    const expiresAt = addMinutesToCurrentTime(
      this.configService.get("VERIFICATION_CODE_EXPIRATION_IN_MINUTES", {
        infer: true,
      })!,
    );

    const [verificationRecord, verificationRecordError] = await safeAwait(
      this.prisma.emailVerification.create({
        data: {
          userId: userRecord.id,
          code: verificationCode,
          expiresAt: expiresAt,
        },
      }),
    );
    if (verificationRecordError != null) {
      this.logger.error(`Add EmailVerification record error`, {
        error: verificationRecordError,
      });
      console.log(verificationRecordError);
      console.log(expiresAt);
      throw new TsRestException(authContract.reSendVerificationCode, {
        status: 500,
        body: {
          message:
            "Something went wrong while trying to send email verification code",
        },
      });
    }

    const resend = new Resend(
      this.configService.get("RESEND_API_KEY", { infer: true })!,
    );

    resend.emails.send({
      from: this.configService.getOrThrow("FROM_EMAIL", { infer: true })!,
      to: data.email,
      subject: "Verify your email",
      react: VerificationCodeTemplate({
        applicationName: this.configService.get("APPLICATION_NAME", {
          infer: true,
        })!,
        code: verificationCode,
        supportEmail: this.configService.get("SUPPORT_EMAIL", { infer: true })!,
        expirationInMinutes: this.configService
          .get("VERIFICATION_CODE_EXPIRATION_IN_MINUTES", {
            infer: true,
          })!
          .toString(),
      }),
    });

    return {
      verificationId: verificationRecord.id,
      message: "Email with the verification code has been sent to your email.",
    };
  }

  async verifyEmail(data: { email: string; verificationCode: string }) {
    const [userRecord, userRecordError] = await safeAwait(
      this.prisma.user.findUniqueOrThrow({
        where: {
          email: data.email,
        },
        include: {
          emailVerification: true,
        },
      }),
    );
    if (userRecordError != null) {
      this.logger.error(`Query EmailVerification record error`, {
        error: userRecordError,
      });
      throw new TsRestException(authContract.verifyEmail, {
        status: 404,
        body: {
          message: "No verification record was found",
        },
      });
    }

    if (userRecord.isEmailVerified) {
      this.logger.error(`This account is already verified`);
      throw new TsRestException(authContract.verifyEmail, {
        status: 400,
        body: {
          message: "The account is already verified",
        },
      });
    }

    if (data.verificationCode !== userRecord.emailVerification.code) {
      this.logger.error(`Verification code mismatch`);
      throw new TsRestException(authContract.verifyEmail, {
        status: 400,
        body: {
          message: "The provided verification code does not match",
        },
      });
    }

    const currentTime = new Date();
    if (currentTime > userRecord.emailVerification.expiresAt) {
      this.logger.error(`Verification code has expired`);
      throw new TsRestException(authContract.verifyEmail, {
        status: 400,
        body: {
          message: "Verification code has expired",
        },
      });
    }

    const [, updateUserRecordError] = await safeAwait(
      this.prisma.user.update({
        where: {
          id: userRecord.id,
        },
        data: {
          isActive: true,
          isEmailVerified: true,
        },
      }),
    );
    if (updateUserRecordError != null) {
      this.logger.error(`Update User record error`, {
        error: updateUserRecordError,
      });
      throw new TsRestException(authContract.verifyEmail, {
        status: 500,
        body: {
          message: "Something went wrong while verifying your email",
        },
      });
    }

    return { message: "Verification successfull" };
  }

  async sendPasswordResetCode(data: { email: string }) {
    const [userRecord, userRecordError] = await safeAwait(
      this.prisma.user.findUniqueOrThrow({
        where: {
          email: data.email,
        },
      }),
    );
    if (userRecordError != null) {
      this.logger.error(`Query User record error`, { error: userRecordError });
      throw new TsRestException(authContract.sendPasswordResetCode, {
        status: 404,
        body: {
          message: "Account not found",
        },
      });
    }

    const resetCode = generateSixDigitCode();
    const expiresAt = addMinutesToCurrentTime(
      this.configService.get("PASSWORD_RESET_CODE_EXPIRATION_IN_MINUTES", {
        infer: true,
      })!,
    );

    const [resetRecord, resetRecordError] = await safeAwait(
      this.prisma.passwordReset.create({
        data: {
          userId: userRecord.id,
          code: resetCode,
          expiresAt: expiresAt,
        },
      }),
    );
    if (resetRecordError != null) {
      this.logger.error(`Add PasswordReset record error`, {
        error: resetRecordError,
      });
      throw new TsRestException(authContract.sendPasswordResetCode, {
        status: 500,
        body: {
          message: "Something went wrong while trying to send reset code",
        },
      });
    }

    const resend = new Resend(
      this.configService.get("RESEND_API_KEY", { infer: true })!,
    );

    resend.emails.send({
      from: this.configService.getOrThrow("FROM_EMAIL", { infer: true })!,
      to: data.email,
      subject: "Password reset code",
      react: PasswordResetCodeTemplate({
        applicationName: this.configService.get("APPLICATION_NAME", {
          infer: true,
        })!,
        code: resetCode,
        supportEmail: this.configService.get("SUPPORT_EMAIL", { infer: true })!,
        expirationInMinutes: this.configService
          .get("PASSWORD_RESET_CODE_EXPIRATION_IN_MINUTES", {
            infer: true,
          })!
          .toString(),
      }),
    });

    return {
      resetId: resetRecord.id,
      message: "Email with the reset code has been sent to your email.",
    };
  }

  async resetPassword(data: {
    resetId: string;
    resetCode: string;
    password: string;
  }) {
    const [resetRecord, resetRecordError] = await safeAwait(
      this.prisma.passwordReset.findUniqueOrThrow({
        where: {
          id: data.resetId,
        },
        include: {
          user: {
            select: {
              id: true,
            },
          },
        },
      }),
    );
    if (resetRecordError != null) {
      this.logger.error(`Query [PasswordReset] record error`, {
        error: resetRecordError,
      });
      throw new TsRestException(authContract.sendPasswordResetCode, {
        status: 404,
        body: {
          message: "No password reset record was found",
        },
      });
    }

    if (data.resetCode !== resetRecord.code) {
      this.logger.error(`Reset code mismatch`);
      throw new TsRestException(authContract.resetPassword, {
        status: 400,
        body: {
          message:
            "The provided reset code does not match what we have on record",
        },
      });
    }

    const currentTime = new Date();
    if (currentTime > resetRecord.expiresAt) {
      this.logger.error(`Reset code has expired`);
      throw new TsRestException(authContract.resetPassword, {
        status: 400,
        body: {
          message: "Reset code has expired",
        },
      });
    }

    const [, updateUserRecordError] = await safeAwait(
      this.prisma.user.update({
        where: {
          id: resetRecord.user.id,
        },
        data: {
          password: await this.passwordService.hash(data.password),
        },
      }),
    );
    if (updateUserRecordError != null) {
      this.logger.error(`Update [User] record error`, {
        error: updateUserRecordError,
      });
      throw new TsRestException(authContract.resetPassword, {
        status: 500,
        body: {
          message: "Something went wrong while trying to reset your password",
        },
      });
    }

    return { message: "Password reset successfull" };
  }

  async changePassword(data: { userId: string; newPassword: string }) {
    const [, updateUserRecordError] = await safeAwait(
      this.prisma.user.update({
        where: {
          id: data.userId,
        },
        data: {
          password: await this.passwordService.hash(data.newPassword),
        },
      }),
    );
    if (updateUserRecordError != null) {
      this.logger.error(`Update [User] record error`, {
        error: updateUserRecordError,
      });
      throw new TsRestException(authContract.changePassword, {
        status: 500,
        body: {
          message: "Something went wrong while trying to change user password",
        },
      });
    }

    return { message: "Password changed successfully" };
  }

  /**
   * Refreshs the access token and revokes the old one.
   * */
  async refreshToken(data: { refreshToken: string; userAgent: string }) {
    const [refreshTokenRecord, refreshTokenRecordError] = await safeAwait(
      this.prisma.refreshToken.findUniqueOrThrow({
        where: {
          token: data.refreshToken,
        },
        include: {
          user: true,
        },
      }),
    );
    if (refreshTokenRecordError != null) {
      this.logger.error(
        `Query [RefreshToken] record error ${JSON.stringify(data.refreshToken)}`,
        {
          error: refreshTokenRecordError,
        },
      );
      throw new TsRestException(authContract.refreshToken, {
        status: 401,
        body: {
          message: "Unauthorized",
        },
      });
    }

    if (await this.validateRefreshToken(data.refreshToken)) {
      const JWT_ISSUER = this.configService.get("JWT_ISSUER", {
        infer: true,
      })!;
      const JWT_AUDIENCE = this.configService.get("JWT_AUDIENCE", {
        infer: true,
      })!;
      const accessTokenExpiresAt = addMinutesToCurrentTime(
        this.configService.get<number>("ACCESS_TOKEN_EXPIRATION_IN_MINUTES", {
          infer: true,
        })!,
      );
      const refreshTokenExpiresAt = addMinutesToCurrentTime(
        this.configService.get<number>("REFRESH_TOKEN_EXPIRATION_IN_MINUTES", {
          infer: true,
        })!,
      );

      const payload = {
        sub: refreshTokenRecord.user.id,
        iss: JWT_ISSUER,
        aud: JWT_AUDIENCE,
        role: refreshTokenRecord.user.role,
      };

      const deviceId = uuidv4();
      const deviceName = data.userAgent;

      const accessToken = this.jwtService.sign(payload);
      const refreshToken = await this.generateAndSaveRefreshToken({
        userId: refreshTokenRecord.user.id,
        deviceId: deviceId,
        deviceName: deviceName,
      });

      const [ok] = await this.revokeRefreshTokenByTokenId(
        refreshTokenRecord.id,
      );
      if (!ok) {
        this.logger.log(
          `Old refresh token cleanup failed. Skiping to be cleaned up by recurring job`,
        );
      }

      return {
        auth: {
          accessToken: accessToken,
          refreshToken: refreshToken,
          deviceId: deviceId,
          deviceName: deviceName,
          accessTokenExpiresIn: accessTokenExpiresAt.getTime(),
          refreshTokenExpiresIn: refreshTokenExpiresAt.getTime(),
        },
      };
    }

    throw new TsRestException(authContract.refreshToken, {
      status: 400,
      body: {
        message: `Invalid refresh token.`,
      },
    });
  }

  async logout(data: {
    userId: string;
    refreshToken: string;
    deviceId: string;
  }) {
    const [ok] = await this.revokeRefreshTokenByUserAndDeviceId(
      data.userId,
      data.deviceId,
    );
    if (!ok) {
      throw new TsRestException(authContract.logout, {
        status: 401,
        body: {
          message: "Unauthorized",
        },
      });
    }

    return {
      message: "successfully logged out",
    };
  }

  async me(userId: string) {
    const [userRecord, userRecordError] = await safeAwait(
      this.prisma.user.findUniqueOrThrow({
        where: {
          id: userId,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          isEmailVerified: true,
          isActive: true,
        },
      }),
    );
    if (userRecordError != null) {
      this.logger.error(`Query [User] record error with userId: ${userId}`, {
        error: userRecordError,
      });
      throw new TsRestException(authContract.me, {
        status: 401,
        body: {
          message: "Unauthorized",
        },
      });
    }

    return userRecord;
  }

  async getCurrentActiveSessions(userId: string) {
    const [userRecord, userRecordError] = await safeAwait(
      this.prisma.user.findUniqueOrThrow({
        where: {
          id: userId,
        },
        select: {
          refreshToken: true,
        },
      }),
    );
    if (userRecordError != null) {
      this.logger.error(`Query [User] record error with id ${userId}`, {
        error: userRecordError,
      });
      throw new TsRestException(authContract.me, {
        status: 401,
        body: {
          message: "Unauthorized",
        },
      });
    }

    const sessions = userRecord.refreshToken.map((token) => ({
      id: token.id,
      deviceName: token.deviceName,
      deviceId: token.deviceId,
      createdAt: token.createdAt,
    }));

    return sessions;
  }

  async revokeSession(data: { userId: string; sessionId: string }) {
    const [ok] = await this.revokeRefreshTokenByTokenAndUserId(
      data.userId,
      data.sessionId,
    );
    if (!ok) {
      throw new TsRestException(authContract.logout, {
        status: 401,
        body: {
          message: "Unauthorized",
        },
      });
    }

    return {
      message: "successfully revoked session",
    };
  }
}
