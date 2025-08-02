import { PrismaClient } from "@prisma/client";
import { getComponentLogger } from "../shared";

const logger = getComponentLogger("prisma");

export class PrismaClientManager {
  private static instance: PrismaClient | null = null;

  static getInstance(): PrismaClient {
    if (!this.instance) {
      this.instance = new PrismaClient({
        log: [
          { level: "query", emit: "stdout" },
          { level: "error", emit: "stdout" },
          { level: "info", emit: "stdout" },
          { level: "warn", emit: "stdout" },
        ],
      });

      logger.info("Prisma Client initialized");
    }

    return this.instance;
  }

  static async testConnection(): Promise<boolean> {
    try {
      const client = this.getInstance();
      await client.$queryRaw`SELECT 1`;
      logger.info("Database connection test successful");
      return true;
    } catch (error) {
      logger.error("Database connection test failed", error);
      return false;
    }
  }

  static async disconnect(): Promise<void> {
    if (this.instance) {
      await this.instance.$disconnect();
      this.instance = null;
      logger.info("Prisma Client disconnected");
    }
  }
}

// デフォルトエクスポート
export const prisma = PrismaClientManager.getInstance();
