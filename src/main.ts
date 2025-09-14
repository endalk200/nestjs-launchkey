import { NestFactory } from "@nestjs/core";
import { generateOpenApi } from "@ts-rest/open-api";
import { SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { contract } from "./api.contract";
import * as fs from "fs";
import { Logger, LoggerErrorInterceptor } from "nestjs-pino";
import { ConfigService } from "@nestjs/config";
import { IEnvironmentVariables } from "./environmentVariables";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const configService =
    app.get<ConfigService<IEnvironmentVariables>>(ConfigService);

  app.enableCors({
    origin: ["http://localhost:3000"], // Allow specific origins (frontend client and server)
    credentials: true, // Allow sending cookies or authentication headers with the request
    methods: ["GET", "POST", "PUT", "DELETE"], // Restrict allowed methods
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"], // Allow specific headers
    preflightContinue: false, // Let the server handle OPTIONS requests
  });

  app.setGlobalPrefix("api");
  app.enableShutdownHooks();
  if (configService.get("ENVIRONMENT", { infer: true }!) != "local") {
    app.useLogger(app.get(Logger));
    app.useGlobalInterceptors(new LoggerErrorInterceptor());
  }

  const openApiDocument = generateOpenApi(
    contract,
    {
      info: {
        title: `${configService.get("APPLICATION_NAME", { infer: true }!)} API Doc`,
        version: "1.0.0",
      },
    },
    {
      setOperationId: true,
    },
  );

  fs.writeFileSync(
    "./openapi/swagger.json",
    JSON.stringify(openApiDocument, null, 4),
  );

  SwaggerModule.setup("api", app, openApiDocument);

  await app.listen(4000);
}
bootstrap();
