import { index, integer, primaryKey, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const roadAlerts = sqliteTable("road_alerts", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  address: text("address").notNull().default("Ubicacion GPS confirmada"),
  note: text("note").notNull().default(""),
  reporterId: text("reporter_id").notNull(),
  status: text("status").notNull().default("active"),
  confirmations: integer("confirmations").notNull().default(1),
  denials: integer("denials").notNull().default(0),
  createdAt: integer("created_at").notNull(),
  lastConfirmedAt: integer("last_confirmed_at").notNull(),
  expiresAt: integer("expires_at").notNull()
}, (table) => [
  index("idx_road_alerts_active_expiry").on(table.status, table.expiresAt),
  index("idx_road_alerts_coordinates").on(table.latitude, table.longitude)
]);

export const roadAlertVotes = sqliteTable("road_alert_votes", {
  alertId: text("alert_id").notNull().references(() => roadAlerts.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  vote: text("vote").notNull(),
  createdAt: integer("created_at").notNull()
}, (table) => [
  primaryKey({ columns: [table.alertId, table.userId] }),
  index("idx_road_alert_votes_alert").on(table.alertId)
]);
