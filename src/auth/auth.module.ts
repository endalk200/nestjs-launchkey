import { Module } from "@nestjs/common";
import { PasswordService } from "./base/password.service";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtModule, JwtSecretRequestType } from "@nestjs/jwt";
import * as fs from "fs";
import * as path from "path";
import { TasksService } from "./tasks.service";
import { BaseAuthService } from "./base/auth.service.base";
import { IEnvironmentVariables } from "src/environmentVariables";

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<IEnvironmentVariables>) => ({
        secretOrKeyProvider: (requestType: JwtSecretRequestType) => {
          switch (requestType) {
            case JwtSecretRequestType.SIGN:
              return fs.readFileSync(
                path.join(__dirname, "../../ec-private.pem"),
              );
            case JwtSecretRequestType.VERIFY:
              return fs.readFileSync(
                path.join(__dirname, "../../ec-public.pem"),
              );
            default:
              return "hard!to-guess_secret";
          }
        },
        signOptions: {
          algorithm: "ES256",
          expiresIn: `${configService.get<number>("ACCESS_TOKEN_EXPIRATION_IN_MINUTES")}m`,
        },
        verifyOptions: {
          algorithms: ["ES256"],
        },
      }),
    }),
  ],
  providers: [BaseAuthService, PasswordService, TasksService, AuthService],
  controllers: [AuthController],
  exports: [PasswordService, AuthService],
})
export class AuthModule {}
