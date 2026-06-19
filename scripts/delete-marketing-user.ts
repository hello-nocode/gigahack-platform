#!/usr/bin/env ts-node
/**
 * Script to delete user marketing@technovator.world completely
 * Run with: npx ts-node scripts/delete-marketing-user.ts
 */

import { db } from "../src/db/index";
import { users, teams, teamMembers, teamChallengeApplications, teamJoinRequests, sessions, accounts } from "../src/db/schema";
import { eq, and, inArray } from "drizzle-orm";

const USER_EMAIL = "marketing@technovator.world";

async function deleteUser() {
  console.log(`🔍 Looking for user: ${USER_EMAIL}`);

  // Find user
  const [user] = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(eq(users.email, USER_EMAIL));

  if (!user) {
    console.log("❌ User not found");
    process.exit(1);
  }

  console.log(`✅ Found user: ${user.name} (${user.id})`);

  const userId = user.id;

  // Check teams where user is leader
  const ledTeams = await db
    .select({ id: teams.id, name: teams.name, eventId: teams.eventId })
    .from(teams)
    .where(eq(teams.leaderId, userId));

  console.log(`\n📊 Summary:`);
  console.log(`  - Teams as leader: ${ledTeams.length}`);

  if (ledTeams.length > 0) {
    console.log(`\n⚠️  User is leader of ${ledTeams.length} team(s):`);
    for (const team of ledTeams) {
      const members = await db
        .select({ userId: teamMembers.userId })
        .from(teamMembers)
        .where(eq(teamMembers.teamId, team.id));
      
      console.log(`    - "${team.name}" (${members.length} members)`);
      
      // Find another member to transfer leadership to
      const otherMember = members.find(m => m.userId !== userId);
      
      if (otherMember) {
        console.log(`      → Transferring leadership to member: ${otherMember.userId}`);
        await db
          .update(teams)
          .set({ leaderId: otherMember.userId })
          .where(eq(teams.id, team.id));
      } else {
        console.log(`      → No other members, deleting team...`);
        await db.delete(teams).where(eq(teams.id, team.id));
      }
    }
  }

  // Remove from all teams as member
  console.log("\n🗑️  Removing from teams as member...");
  await db.delete(teamMembers).where(eq(teamMembers.userId, userId));

  // Delete join requests
  console.log("🗑️  Deleting join requests...");
  await db.delete(teamJoinRequests).where(eq(teamJoinRequests.userId, userId));

  // Get user's team memberships for cleaning up applications
  const userTeamIds = await db
    .select({ teamId: teamChallengeApplications.teamId })
    .from(teamChallengeApplications)
    .innerJoin(teamMembers, eq(teamMembers.teamId, teamChallengeApplications.teamId))
    .where(eq(teamMembers.userId, userId))
    .then(rows => [...new Set(rows.map(r => r.teamId))]);

  if (userTeamIds.length > 0) {
    console.log("🗑️  Cleaning up challenge applications...");
    await db
      .delete(teamChallengeApplications)
      .where(inArray(teamChallengeApplications.teamId, userTeamIds));
  }

  // Delete sessions
  console.log("🗑️  Deleting sessions...");
  await db.delete(sessions).where(eq(sessions.userId, userId));

  // Delete OAuth accounts
  console.log("🗑️  Deleting OAuth accounts...");
  await db.delete(accounts).where(eq(accounts.userId, userId));

  // Finally delete user (cascade handles: partnerProfiles, eventRegistrations, 
  // eventTickets, mentorBookings, notifications, notificationPreferences, announcements)
  console.log("🗑️  Deleting user record...");
  await db.delete(users).where(eq(users.id, userId));

  // Verify deletion
  const [remaining] = await db
    .select({ count: db.$count(users, eq(users.id, userId)) })
    .from(users)
    .where(eq(users.id, userId));

  if (remaining) {
    console.log("❌ Error: User still exists!");
    process.exit(1);
  }

  console.log(`\n✅ User ${USER_EMAIL} completely deleted from database`);
  console.log("📋 Deleted data includes:");
  console.log("   - OAuth accounts and sessions");
  console.log("   - Team memberships and join requests");
  console.log("   - Challenge applications");
  console.log("   - Partner profile (if any)");
  console.log("   - Event registrations and tickets");
  console.log("   - Mentor bookings");
  console.log("   - Notifications and preferences");
  console.log("   - User profile and settings");
}

deleteUser()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Error:", err);
    process.exit(1);
  });
