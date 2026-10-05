const assert = require("node:assert/strict");
const { after, test } = require("node:test");
const { randomUUID } = require("node:crypto");

const databaseUrl = process.env.CACHE_REGENERATION_TEST_DATABASE_URL;
let prisma;
let EventCacheService;

function getDependencies() {
  if (!prisma) {
    process.env.DATABASE_URL = databaseUrl;
    const database = require("../src/database/prisma");
    prisma = database.PrismaClientManager.getInstance();
    ({ EventCacheService } = require("../src/services/EventCacheService"));
  }
  return { prisma, EventCacheService };
}

function locationData() {
  return {
    name: `cache-regeneration-test-${randomUUID()}`,
    prefecture: "test",
    latitude: 35,
    longitude: 139,
    elevation: 10,
  };
}

function event(location, id, time, type = "diamond") {
  return {
    id,
    type,
    subType: type === "pearl" ? "rising" : "sunrise",
    time,
    location,
    azimuth: 90,
    elevation: 1,
    accuracy: "good",
  };
}

function storedEvent(locationId, year, time, eventType) {
  return {
    locationId,
    eventDate: new Date(Date.UTC(time.getFullYear(), time.getMonth(), time.getDate())),
    eventTime: time,
    eventType,
    azimuth: 90,
    altitude: 1,
    qualityScore: 0.6,
    calculationYear: year,
    accuracy: "good",
  };
}

function summarize(events) {
  return events
    .map((row) => `${row.eventTime.toISOString()} ${row.eventType}`)
    .sort();
}

async function createLocation(prisma) {
  return prisma.location.create({ data: locationData() });
}

async function waitForLocationLockWaiters(prisma, locationId, year, expected) {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    const rows = await prisma.$queryRaw`
      SELECT count(*)::int AS count
      FROM pg_locks
      WHERE locktype = 'advisory'
        AND classid = ${locationId}::oid
        AND objid = ${year}::oid
        AND objsubid = 2
        AND NOT granted
    `;
    if (rows[0].count >= expected) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`expected ${expected} blocked location-year writers`);
}

after(async () => {
  if (prisma) {
    await prisma.$disconnect();
  }
});

test(
  "overlapping month and day cache generations commit one complete ordering",
  {
    skip:
      !databaseUrl &&
      "set CACHE_REGENERATION_TEST_DATABASE_URL to a dedicated PostgreSQL test database",
  },
  async () => {
    const { prisma, EventCacheService } = getDependencies();
    const location = await createLocation(prisma);
    const year = 2031;
    const month = 5;
    const day = 12;
    const monthDayEventTime = new Date(year, month - 1, day, 9);
    const nextDayEventTime = new Date(year, month - 1, day + 1, 11);
    const dailyEventTime = new Date(year, month - 1, day, 17);
    const priorDayEventTime = new Date(year, month - 1, day, 6);
    const priorMonthEventTime = new Date(year, month - 1, day + 2, 6);

    try {
      await prisma.locationEvent.createMany({
        data: [
          storedEvent(location.id, year, priorDayEventTime, "pearl_moonrise"),
          storedEvent(location.id, year, priorMonthEventTime, "diamond_sunset"),
        ],
      });

      let calculationCount = 0;
      let releaseCalculations;
      const bothCalculationsStarted = new Promise((resolve) => {
        releaseCalculations = resolve;
      });
      const calculator = {
        calculateMonthlyEvents: async (_year, _month, locations) => {
          if (calculationCount++ === 1) releaseCalculations();
          await bothCalculationsStarted;
          return [
            event(locations[0], "month-day", monthDayEventTime),
            event(locations[0], "month-next-day", nextDayEventTime, "pearl"),
          ];
        },
        calculateDiamondFuji: async (_date, locations) => {
          if (calculationCount++ === 1) releaseCalculations();
          await bothCalculationsStarted;
          return [event(locations[0], "day", dailyEventTime)];
        },
        calculatePearlFuji: async () => [],
      };
      const service = new EventCacheService(calculator);
      let releaseLocationLock;
      let signalLocationLockHeld;
      const locationLockHeld = new Promise((resolve) => {
        signalLocationLockHeld = resolve;
      });
      const locationLockRelease = new Promise((resolve) => {
        releaseLocationLock = resolve;
      });
      const lockHolder = prisma.$transaction(async (transaction) => {
        await transaction.$queryRaw`
          WITH lock_result AS MATERIALIZED (
            SELECT pg_advisory_xact_lock(
              ${location.id}::integer,
              ${year}::integer
            )
          )
          SELECT 1 FROM lock_result
        `;
        signalLocationLockHeld();
        await locationLockRelease;
      });

      const generationPromises = [];

      try {
        await locationLockHeld;
        const monthResult = service.generateLocationMonthCache(
          location.id,
          year,
          month,
        );
        const dayResult = service.generateLocationDayCache(
          location.id,
          year,
          month,
          day,
        );
        generationPromises.push(monthResult, dayResult);
        await waitForLocationLockWaiters(prisma, location.id, year, 2);
        releaseLocationLock();

        const results = await Promise.all([monthResult, dayResult]);
        await lockHolder;
        assert.deepEqual(
          results.map(({ success }) => success),
          [true, true],
        );

        const rows = await prisma.locationEvent.findMany({
          where: { locationId: location.id, calculationYear: year },
          orderBy: { eventTime: "asc" },
        });
        const actual = summarize(rows);
        const monthlyLast = summarize([
          { eventTime: monthDayEventTime, eventType: "diamond_sunrise" },
          { eventTime: nextDayEventTime, eventType: "pearl_moonrise" },
        ]);
        const dailyLast = summarize([
          { eventTime: dailyEventTime, eventType: "diamond_sunrise" },
          { eventTime: nextDayEventTime, eventType: "pearl_moonrise" },
        ]);
        assert.ok(
          JSON.stringify(actual) === JSON.stringify(monthlyLast) ||
            JSON.stringify(actual) === JSON.stringify(dailyLast),
          `expected either complete transaction ordering, received ${JSON.stringify(actual)}`,
        );
      } finally {
        releaseLocationLock();
        await lockHolder;
        await Promise.allSettled(generationPromises);
      }
    } finally {
      await prisma.location.delete({ where: { id: location.id } });
    }
  },
);
test(
  "different location cache generations proceed concurrently",
  {
    skip:
      !databaseUrl &&
      "set CACHE_REGENERATION_TEST_DATABASE_URL to a dedicated PostgreSQL test database",
  },
  async () => {
    const { prisma, EventCacheService } = getDependencies();
    const heldLocation = await createLocation(prisma);
    const otherLocation = await createLocation(prisma);
    const year = 2033;
    let releaseLocationLock;
    let signalLocationLockHeld;
    const locationLockHeld = new Promise((resolve) => {
      signalLocationLockHeld = resolve;
    });
    const locationLockRelease = new Promise((resolve) => {
      releaseLocationLock = resolve;
    });
    const lockHolder = prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`
        WITH lock_result AS MATERIALIZED (
          SELECT pg_advisory_xact_lock(
            ${heldLocation.id}::integer,
            ${year}::integer
          )
        )
        SELECT 1 FROM lock_result
      `;
      signalLocationLockHeld();
      await locationLockRelease;
    });

    try {
      await locationLockHeld;
      const service = new EventCacheService({
        calculateMonthlyEvents: async () => [],
      });
      let timeout;
      const result = await Promise.race([
        service.generateLocationMonthCache(otherLocation.id, year, 5),
        new Promise((_, reject) => {
          timeout = setTimeout(
            () => reject(new Error("unrelated location regeneration blocked")),
            5000,
          );
        }),
      ]).finally(() => clearTimeout(timeout));
      assert.equal(result.success, true);
    } finally {
      releaseLocationLock();
      await lockHolder;
      await prisma.location.deleteMany({
        where: { id: { in: [heldLocation.id, otherLocation.id] } },
      });
    }
  },
);
test(
  "all-location annual and month replacements serialize overlapping writes",
  {
    skip:
      !databaseUrl &&
      "set CACHE_REGENERATION_TEST_DATABASE_URL to a dedicated PostgreSQL test database",
  },
  async () => {
    const { prisma, EventCacheService } = getDependencies();
    const location = await createLocation(prisma);
    const year = 2034;
    const month = 5;
    const annualMonthEventTime = new Date(year, month - 1, 12, 8);
    const annualOtherMonthEventTime = new Date(year, month, 12, 8);
    const monthlyEventTime = new Date(year, month - 1, 12, 17);
    let calculationCount = 0;
    let releaseCalculations;
    const bothCalculationsStarted = new Promise((resolve) => {
      releaseCalculations = resolve;
    });
    const waitForBothCalculations = async () => {
      if (calculationCount++ === 1) releaseCalculations();
      await bothCalculationsStarted;
    };

    try {
      const service = new EventCacheService({
        calculateLocationYearlyEvents: async (targetLocation) => {
          await waitForBothCalculations();
          return [
            event(targetLocation, "annual-month", annualMonthEventTime),
            event(
              targetLocation,
              "annual-other-month",
              annualOtherMonthEventTime,
              "pearl",
            ),
          ];
        },
        calculateMonthlyEvents: async (_year, _month, [targetLocation]) => {
          await waitForBothCalculations();
          return [event(targetLocation, "monthly", monthlyEventTime)];
        },
      });

      const results = await Promise.all([
        service.generateYearlyCache(year),
        service.generateLocationMonthCache(location.id, year, month),
      ]);
      assert.deepEqual(
        results.map(({ success }) => success),
        [true, true],
      );

      const rows = await prisma.locationEvent.findMany({
        where: { locationId: location.id, calculationYear: year },
      });
      const actual = summarize(rows);
      const annualLast = summarize([
        { eventTime: annualMonthEventTime, eventType: "diamond_sunrise" },
        { eventTime: annualOtherMonthEventTime, eventType: "pearl_moonrise" },
      ]);
      const monthlyLast = summarize([
        { eventTime: monthlyEventTime, eventType: "diamond_sunrise" },
        { eventTime: annualOtherMonthEventTime, eventType: "pearl_moonrise" },
      ]);
      assert.ok(
        JSON.stringify(actual) === JSON.stringify(annualLast) ||
          JSON.stringify(actual) === JSON.stringify(monthlyLast),
        `expected either complete transaction ordering, received ${JSON.stringify(actual)}`,
      );
    } finally {
      await prisma.location.delete({ where: { id: location.id } });
    }
  },
);

test(
  "failed annual location calculations preserve previous cache rows",
  {
    skip:
      !databaseUrl &&
      "set CACHE_REGENERATION_TEST_DATABASE_URL to a dedicated PostgreSQL test database",
  },
  async () => {
    const { prisma, EventCacheService } = getDependencies();
    const location = await createLocation(prisma);
    const year = 2035;
    const oldEventTime = new Date(year, 4, 12, 8);
    const service = new EventCacheService({
      calculateLocationYearlyEvents: async () => {
        throw new Error("annual calculation failed");
      },
    });

    try {
      await prisma.locationEvent.create({
        data: storedEvent(location.id, year, oldEventTime, "diamond_sunrise"),
      });
      await assert.rejects(
        service.generateLocationCache(location.id, year),
        /annual calculation failed/,
      );

      const rows = await prisma.locationEvent.findMany({
        where: { locationId: location.id, calculationYear: year },
      });
      assert.deepEqual(summarize(rows), [
        `${oldEventTime.toISOString()} diamond_sunrise`,
      ]);
    } finally {
      await prisma.location.delete({ where: { id: location.id } });
    }
  },
);




test(
  "a failed calculation preserves the previous cache rows",
  {
    skip:
      !databaseUrl &&
      "set CACHE_REGENERATION_TEST_DATABASE_URL to a dedicated PostgreSQL test database",
  },
  async () => {
    const { prisma, EventCacheService } = getDependencies();
    const location = await createLocation(prisma);
    const year = 2032;
    const month = 5;
    const originalTime = new Date(year, month - 1, 12, 8);

    try {
      await prisma.locationEvent.create({
        data: storedEvent(location.id, year, originalTime, "diamond_sunrise"),
      });
      const service = new EventCacheService({
        calculateMonthlyEvents: async () => {
          throw new Error("calculation failed");
        },
      });

      const result = await service.generateLocationMonthCache(
        location.id,
        year,
        month,
      );
      assert.equal(result.success, false);

      const rows = await prisma.locationEvent.findMany({
        where: { locationId: location.id, calculationYear: year },
      });
      assert.deepEqual(summarize(rows), [
        `${originalTime.toISOString()} diamond_sunrise`,
      ]);
    } finally {
      await prisma.location.delete({ where: { id: location.id } });
    }
  },
);
