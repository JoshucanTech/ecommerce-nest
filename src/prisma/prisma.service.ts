import {
  Injectable,
  type OnModuleInit,
  type OnModuleDestroy,
} from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      log: ["query", "info", "warn", "error"],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV === "production") {
      return;
    }

    const models = Reflect.ownKeys(this).filter(
      (key) =>
        typeof key === "string" &&
        !key.startsWith("_") &&
        key !== "$connect" &&
        key !== "$disconnect" &&
        key !== "$on" &&
        key !== "$transaction" &&
        key !== "$use",
    );

    return Promise.all(
      models.map((modelKey) => {
        return this[modelKey].deleteMany();
      }),
    );
  }
}
