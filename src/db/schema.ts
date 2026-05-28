import {
  pgTable,
  pgEnum,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  uuid,
  primaryKey,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

// ── Enums ────────────────────────────────────────────────────────────────────

export const eventStatusEnum = pgEnum("event_status", [
  "draft",
  "registration_open",
  "applications_open",
  "in_progress",
  "judging",
  "completed",
]);

export const roleEnum = pgEnum("role", [
  "participant",
  "partner_admin",
  "mentor",
  "coach",
  "jury",
  "admin",
]);

// ── Auth.js required tables ──────────────────────────────────────────────────

export const globalRoleEnum = pgEnum("global_role", ["user", "admin"]);
export const genderEnum = pgEnum("gender", ["male", "female", "other", "prefer_not_to_say"]);

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique().notNull(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  globalRole: globalRoleEnum("global_role").notNull().default("user"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  gender: genderEnum("gender"),
  phone: text("phone"),
  linkedin: text("linkedin"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { mode: "date" }),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => [primaryKey({ columns: [table.provider, table.providerAccountId] })],
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.identifier, table.token] })],
);

// ── Core domain tables ───────────────────────────────────────────────────────

export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  year: integer("year").notNull().unique(),
  status: eventStatusEnum("status").notNull().default("draft"),
  partnerApplicationsOpen: boolean("partner_applications_open").notNull().default(false),
  registrationOpen: boolean("registration_open").notNull().default(false),
  description: text("description"),
  coverImageUrl: text("cover_image_url"),
  location: text("location"),
  customSections: jsonb("custom_sections").$type<{ title: string; body: string }[]>(),
  minTeamSize: integer("min_team_size").notNull().default(2),
  maxTeamSize: integer("max_team_size").notNull().default(5),
  maxChallengeApplications: integer("max_challenge_applications").notNull().default(2),
  startsAt: timestamp("starts_at", { mode: "date" }),
  endsAt: timestamp("ends_at", { mode: "date" }),
  timezone: text("timezone").notNull().default("Europe/Chisinau"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const eventRoles = pgTable(
  "event_roles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    role: roleEnum("role").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("event_roles_user_event_role_idx").on(table.userId, table.eventId, table.role),
    index("event_roles_user_idx").on(table.userId),
    index("event_roles_event_idx").on(table.eventId),
  ],
);

// ── Partner invites ──────────────────────────────────────────────────────────

export const partnerInvites = pgTable("partner_invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  code: text("code").notNull().unique(),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  usedBy: text("used_by").references(() => users.id, { onDelete: "set null" }),
  usedAt: timestamp("used_at", { mode: "date" }),
  expiresAt: timestamp("expires_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

// ── Partner profiles ─────────────────────────────────────────────────────────

export const partnerProfiles = pgTable(
  "partner_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    companyName: text("company_name").notNull(),
    logoUrl: text("logo_url"),
    website: text("website"),
    description: text("description"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("partner_profiles_user_event_idx").on(table.userId, table.eventId),
  ],
);

// ── Challenges ───────────────────────────────────────────────────────────────

export const challengeStatusEnum = pgEnum("challenge_status", [
  "draft",
  "published",
  "archived",
]);

export const challenges = pgTable("challenges", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  partnerId: uuid("partner_id")
    .notNull()
    .references(() => partnerProfiles.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  status: challengeStatusEnum("status").notNull().default("draft"),
  description: text("description"),
  problemStatement: text("problem_statement"),
  expectedSolution: text("expected_solution"),
  techRequirements: text("tech_requirements"),
  prizes: jsonb("prizes"),
  maxTeams: integer("max_teams"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

// ── Judging criteria ─────────────────────────────────────────────────────────

export const judgingCriteria = pgTable("judging_criteria", {
  id: uuid("id").primaryKey().defaultRandom(),
  challengeId: uuid("challenge_id")
    .notNull()
    .references(() => challenges.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  weight: integer("weight").notNull(),
  maxScore: integer("max_score").notNull().default(10),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

// ── Challenge Prizes ─────────────────────────────────────────────────────────

export const prizeTypeEnum = pgEnum("prize_type", ["cash", "voucher", "product", "service", "other"]);

export const challengePrizes = pgTable(
  "challenge_prizes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    challengeId: uuid("challenge_id")
      .notNull()
      .references(() => challenges.id, { onDelete: "cascade" }),
    place: text("place").notNull(), // e.g. "1st", "2nd", "3rd"
    value: text("value").notNull(), // e.g. "5000 EUR", "MacBook Pro"
    type: prizeTypeEnum("type").notNull().default("cash"),
    numTeams: integer("num_teams").notNull().default(1), // how many teams win this prize
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("challenge_prizes_challenge_idx").on(table.challengeId),
  ],
);

// ── Teams ─────────────────────────────────────────────────────────────────────

export const teamStatusEnum = pgEnum("team_status", [
  "forming",
  "registered",
  "disqualified",
]);

export const teams = pgTable(
  "teams",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    leaderId: text("leader_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    status: teamStatusEnum("status").notNull().default("forming"),
    inviteCode: text("invite_code").unique(),
    acceptingNewMembers: boolean("accepting_new_members").notNull().default(true),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("teams_event_name_idx").on(table.eventId, table.name),
    index("teams_event_idx").on(table.eventId),
    index("teams_leader_idx").on(table.leaderId),
  ],
);

export const teamMemberRoleEnum = pgEnum("team_member_role", ["leader", "member"]);

export const teamMembers = pgTable(
  "team_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: teamMemberRoleEnum("role").notNull().default("member"),
    joinedAt: timestamp("joined_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("team_members_team_user_idx").on(table.teamId, table.userId),
    index("team_members_user_idx").on(table.userId),
  ],
);

export const applicationStatusEnum = pgEnum("application_status", [
  "pending",
  "accepted",
  "rejected",
  "withdrawn",
]);

export const teamChallengeApplications = pgTable(
  "team_challenge_applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    challengeId: uuid("challenge_id")
      .notNull()
      .references(() => challenges.id, { onDelete: "cascade" }),
    status: applicationStatusEnum("status").notNull().default("pending"),
    note: text("note"),
    reviewedBy: text("reviewed_by").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("team_challenge_app_idx").on(table.teamId, table.challengeId),
    index("team_challenge_app_team_idx").on(table.teamId),
    index("team_challenge_app_challenge_idx").on(table.challengeId),
  ],
);

// ── Event registrations ─────────────────────────────────────────────────────

export const registrationStatusEnum = pgEnum("registration_status", [
  "pending",
  "approved",
  "rejected",
  "withdrawn",
]);

export const eventRegistrations = pgTable(
  "event_registrations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: registrationStatusEnum("status").notNull().default("pending"),
    ticketNumber: text("ticket_number"),
    motivation: text("motivation"),
    skills: text("skills"),
    experience: text("experience"),
    reviewedBy: text("reviewed_by").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("event_reg_event_user_idx").on(table.eventId, table.userId),
    index("event_reg_event_idx").on(table.eventId),
    index("event_reg_user_idx").on(table.userId),
    index("event_reg_status_idx").on(table.status),
  ],
);

// ── Event tickets ───────────────────────────────────────────────────────────

export const eventTickets = pgTable(
  "event_tickets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    ticketNumber: text("ticket_number").notNull(),
    claimedBy: text("claimed_by").references(() => users.id, { onDelete: "set null" }),
    claimedAt: timestamp("claimed_at", { mode: "date" }),
    uploadedAt: timestamp("uploaded_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("event_tickets_event_number_idx").on(table.eventId, table.ticketNumber),
    index("event_tickets_event_idx").on(table.eventId),
    index("event_tickets_claimed_idx").on(table.claimedBy),
  ],
);

// ── Team join requests ────────────────────────────────────────────────────────

export const joinRequestStatusEnum = pgEnum("join_request_status", [
  "pending",
  "accepted",
  "rejected",
  "cancelled",
]);

export const teamJoinRequests = pgTable(
  "team_join_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: joinRequestStatusEnum("status").notNull().default("pending"),
    message: text("message"),
    reviewedBy: text("reviewed_by").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("team_join_req_team_user_idx").on(table.teamId, table.userId),
    index("team_join_req_user_idx").on(table.userId),
    index("team_join_req_team_idx").on(table.teamId),
  ],
);

// ── Audit log (immutable — insert only) ─────────────────────────────────────

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id").references(() => events.id, { onDelete: "set null" }),
    actorId: text("actor_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    beforeState: jsonb("before_state"),
    afterState: jsonb("after_state"),
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("audit_log_event_idx").on(table.eventId),
    index("audit_log_actor_idx").on(table.actorId),
    index("audit_log_entity_idx").on(table.entityType, table.entityId),
    index("audit_log_created_idx").on(table.createdAt),
  ],
);

// ── Types ────────────────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type EventRole = typeof eventRoles.$inferSelect;
export type AuditLogEntry = typeof auditLog.$inferSelect;
export type NewAuditLogEntry = typeof auditLog.$inferInsert;
export type PartnerInvite = typeof partnerInvites.$inferSelect;
export type PartnerProfile = typeof partnerProfiles.$inferSelect;
export type Challenge = typeof challenges.$inferSelect;
export type NewChallenge = typeof challenges.$inferInsert;
export type JudgingCriterion = typeof judgingCriteria.$inferSelect;
export type ChallengePrize = typeof challengePrizes.$inferSelect;
export type NewChallengePrize = typeof challengePrizes.$inferInsert;
export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
export type TeamMember = typeof teamMembers.$inferSelect;
export type TeamChallengeApplication = typeof teamChallengeApplications.$inferSelect;
export type TeamJoinRequest = typeof teamJoinRequests.$inferSelect;
export type EventRegistration = typeof eventRegistrations.$inferSelect;
export type EventTicket = typeof eventTickets.$inferSelect;
