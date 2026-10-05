const assert = require("node:assert/strict");
const { setTimeout: delay } = require("node:timers/promises");
const { test } = require("node:test");
const { QueueService } = require("../src/services/QueueService");

test("repeated Redis-ready events reuse the queue and worker", async () => {
  const service = new QueueService(null, true);
  let originalQueue;
  let originalWorker;

  try {
    for (let attempt = 0; attempt < 100 && !service["worker"]; attempt += 1) {
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
    assert.equal(service.getCurrentConcurrency(), concurrency);
  } finally {
    await service.shutdown();
    if (originalQueue && originalQueue !== service["eventCalculationQueue"]) {
      await originalQueue.close();
    }
    if (originalWorker && originalWorker !== service["worker"]) {
      await originalWorker.close();
    }
  }
});
