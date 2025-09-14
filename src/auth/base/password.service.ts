import { Injectable } from "@nestjs/common";
import { hash, compare } from "bcrypt";
import { ConfigService } from "@nestjs/config";
import { IEnvironmentVariables } from "src/environmentVariables";

@Injectable()
export class PasswordService {
  constructor(private configService: ConfigService<IEnvironmentVariables>) {}

  compare(password: string, encrypted: string): Promise<boolean> {
    return compare(password, encrypted);
  }

  async hash(password: string): Promise<string> {
    const BCRYPT_SALT_ROUND = this.configService.get("BCRYPT_SALT_ROUND", {
      infer: true,
    })!;

    return hash(password, 10);
  }
}
