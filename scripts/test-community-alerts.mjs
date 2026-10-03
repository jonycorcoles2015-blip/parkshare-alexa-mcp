import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import worker from "../worker/index.js";

class TestStatement {
  constructor(database, sql, values = []) {
    this.database = database;
    this.sql = sql;
    this.values = values;
  }

  bind(...values) {
    return new TestStatement(this.database, this.sql, values);
  }

  async run() {
    return this.database.prepare(this.sql).run(...this.values);
  }

  async all() {
    return { results: this.database.prepare(this.sql).all(...this.values) };
  }

  async first() {
    return this.database.prepare(this.sql).get(...this.values) || null;
  }
}

class TestD1Database {
  constructor(database) {
    this.database = database;
  }

  prepare(sql) {
    return new TestStatement(this.database, sql);
  }

  async batch(statements) {
    const results = [];
    for (const statement of statements) {
      results.push(await statement.run());
    }
    return results;
  }
}

const sqlite = new DatabaseSync(":memory:");
const migration = readFileSync("drizzle/0000_gray_sandman.sql", "utf8")
  .replaceAll("--> statement-breakpoint", "");
sqlite.exec(migration);

const env = { DB: new TestD1Database(sqlite) };
const reporterId = "test-device-zaragoza";

async function call(tool, args) {
  const request = new Request("https://parkshare.test/demo", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ tool, arguments: args })
  });
  const response = await worker.fetch(request, env, {});
  assert.equal(response.status, 200);
  return response.json();
}

const reported = await call("report_road_alert", {
  alertType: "accident",
  latitude: 41.6488,
  longitude: -0.8891,
  locationLabel: "Zaragoza",
  clientReporterId: reporterId
});
assert.equal(reported.structuredContent.alertRecorded, true);
const alertId = reported.structuredContent.alert.id;

const nearby = await call("get_road_alerts", {
  origin: "Zaragoza",
  destination: "Zaragoza",
  latitude: 41.6488,
  longitude: -0.8891
});
assert.equal(nearby.structuredContent.alerts.length, 1);
assert.equal(nearby.structuredContent.alerts[0].source, "parkshare_community");

const confirmed = await call("confirm_road_alert", {
  alertId,
  observation: "still_present",
  clientReporterId: "second-test-device"
});
assert.equal(confirmed.structuredContent.confirmations, 2);

const cleared = await call("confirm_road_alert", {
  alertId,
  observation: "cleared",
  clientReporterId: reporterId
});
assert.equal(cleared.structuredContent.alertActive, false);

const afterClear = await call("get_road_alerts", {
  origin: "Zaragoza",
  destination: "Zaragoza",
  latitude: 41.6488,
  longitude: -0.8891
});
assert.equal(afterClear.structuredContent.alerts.length, 0);

console.log("Community road alert flow passed");
