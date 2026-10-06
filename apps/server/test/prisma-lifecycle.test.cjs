const { spawn } = require("node:child_process");
const path = require("node:path");
const { once } = require("node:events");
const assert = require("node:assert/strict");
const { test } = require("node:test");

const { Bootstrap } = require("../src/bootstrap");
const { PrismaClientManager } = require("../src/database/prisma");
const { ServiceRegistry } = require("../src/di/ServiceRegistry");

class MinimalContainer {
  constructor() {
    this.factories = new Map();
    this.instances = new Map();
  }

  registerSingleton(key, factory) {
    this.factories.set(key, factory);
  }

  register(key, factory) {
    this.factories.set(key, factory);
  }

  configureDependencies() {}

  getRegisteredServices() {
    return [...this.factories.keys()];
  }

  resolve(key) {
    if (this.instances.has(key)) return this.instances.get(key);
    const factory = this.factories.get(key);
    if (!factory) throw new Error(`Service not registered: ${key}`);
    const instance = factory(this);
    this.instances.set(key, instance);
    return instance;
  }
}

test("DI and graceful shutdown use and disconnect the shared Prisma client", async () => {
  const container = new MinimalContainer();
  ServiceRegistry.configure(container);
  const sharedClient = PrismaClientManager.getInstance();
  const originalDisconnect = sharedClient.$disconnect;
  let disconnectCalls = 0;
  const cleanupOrder = [];
  sharedClient.$disconnect = async () => {
    disconnectCalls += 1;
    cleanupOrder.push("prisma");
  };
  container.instances.set("QueueService", {
    async shutdown() {
      cleanupOrder.push("queue");
    },
  });
  container.instances.set("BackgroundJobScheduler", {
    stop() {
      cleanupOrder.push("scheduler");
    },
  });

  try {
    assert.strictEqual(container.resolve("PrismaClient"), sharedClient);
    await Bootstrap.shutdown(container);
    assert.equal(disconnectCalls, 1);
    assert.deepEqual(cleanupOrder, ["queue", "scheduler", "prisma"]);
  } finally {
    await PrismaClientManager.disconnect();
    sharedClient.$disconnect = originalDisconnect;
  }
});

test("worker graceful shutdown disconnects the shared Prisma client", async () => {
  const worker = spawn(
    process.execPath,
    [
      "-r",
      "ts-node/register",
      "-r",
      "tsconfig-paths/register",
      "src/worker.ts",
    ],
    {
      cwd: path.resolve(__dirname, ".."),
      env: {
        ...process.env,
        DATABASE_URL: "postgresql://test:test@127.0.0.1:1/test?connect_timeout=1",
        DISABLE_REDIS: "true",
        TS_NODE_PROJECT: "tsconfig.json",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let output = "";
  worker.stdout.on("data", (chunk) => {
    output += chunk;
  });
  worker.stderr.on("data", (chunk) => {
    output += chunk;
  });

  try {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error(`Worker did not start: ${output}`)),
        10000,
      );
      worker.once("error", reject);
      worker.once("exit", (code) => {
        clearTimeout(timeout);
        reject(new Error(`Worker exited before startup with ${code}: ${output}`));
      });
      worker.stdout.on("data", () => {
        if (output.includes("キューワーカーが正常に開始されました")) {
          clearTimeout(timeout);
          resolve();
        }
      });
    });

    worker.kill("SIGTERM");
    const [exitCode] = await once(worker, "exit");
    assert.equal(exitCode, 0, output);
    assert.ok(
      output.includes("Prisma Client disconnected"),
      "worker shutdown did not disconnect Prisma",
    );
  } finally {
    if (worker.exitCode === null) {
      worker.kill("SIGKILL");
      await once(worker, "exit");
    }
  }
});
