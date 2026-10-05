const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const Module = require("node:module");
const { setTimeout: delay } = require("node:timers/promises");
const { test } = require("node:test");

const originalLoad = Module._load;
const queues = [];
const workers = [];

class FakeRedis extends EventEmitter {
  async quit() {}
}

class FakeQueue {
  constructor() {
    queues.push(this);
  }

  async close() {}
}

class FakeWorker extends EventEmitter {
  constructor(_name, _processor, options) {
    super();
    this.opts = options;
    workers.push(this);
  }

  async close() {}
}

Module._load = function (request, parent, isMain) {
  if (request === "bullmq") {
    return { Queue: FakeQueue, Worker: FakeWorker, Job: class Job {} };
  }
  if (request === "ioredis") {
    return { __esModule: true, default: FakeRedis };
  }
  return originalLoad.call(this, request, parent, isMain);
};

const { QueueService } = require("../src/services/QueueService");
Module._load = originalLoad;

test("repeated Redis-ready events reuse the queue and worker", async () => {
  const disabledBeforeTest = process.env.DISABLE_REDIS;
  delete process.env.DISABLE_REDIS;
  const service = new QueueService(null, true);
  let originalQueue;
  let originalWorker;

  try {
    service["redis"].emit("ready");
    for (let attempt = 0; attempt < 20 && !service["worker"]; attempt += 1) {
      await delay(100);
    }

    assert.ok(service["worker"], "initial Redis-ready event creates a worker");
    originalQueue = service["eventCalculationQueue"];
    originalWorker = service["worker"];
    const concurrency = service.getCurrentConcurrency();

    service["redis"].emit("ready");
    await delay(1100);

    assert.strictEqual(service["eventCalculationQueue"], originalQueue);
    assert.strictEqual(service["worker"], originalWorker);
    assert.equal(queues.length, 1);
    assert.equal(workers.length, 1);
    assert.equal(service.getCurrentConcurrency(), concurrency);
  } finally {
    await service.shutdown();
    if (disabledBeforeTest !== undefined) {
      process.env.DISABLE_REDIS = disabledBeforeTest;
    }
  }
});
