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
