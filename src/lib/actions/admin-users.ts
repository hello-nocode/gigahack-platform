"use server";

import { db } from "@db/index";
import { users, teams, teamMembers, teamChallengeApplications, teamJoinRequests } from "@db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { isAdmin } from "@/lib/permissions";
import { auth } from "@/lib/auth/config";
import { revalidatePath } from "next/cache";

async function requireAdminId(): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const admin = await isAdmin(session.user.id);
  return admin ? session.user.id : null;
}

export type DeleteUserResult =
  | { success: true; message: string; deletedTeams: string[]; transferredTeams: string[] }
  | { success: false; error: string };

/**
 * Completely delete a user and all their data from the system
 * Handles teams by either transferring leadership or deleting the team
 */
export async function deleteUserCompletely(
  userIdToDelete: string,
  options: {
    transferTeamsTo?: string; // User ID to transfer team leadership to (optional)
    deleteTeamsIfNoTransfer?: boolean; // Delete teams if can't transfer (default: true)
  } = {}
): Promise<DeleteUserResult> {
  // Verify admin
  const adminId = await requireAdminId();
  if (!adminId) {
    return { success: false, error: "Not authorized - admin only" };
  }

  // Prevent self-deletion
  if (userIdToDelete === adminId) {
    return { success: false, error: "Cannot delete yourself" };
  }

  // Verify user exists
  const [user] = await db.select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(eq(users.id, userIdToDelete));
  
  if (!user) {
    return { success: false, error: "User not found" };
  }

  const deletedTeams: string[] = [];
  const transferredTeams: string[] = [];

  try {
    // 1. Handle teams where user is leader (RESTRICT constraint)
    const ledTeams = await db
      .select({ 
        id: teams.id, 
        name: teams.name,
        eventId: teams.eventId 
      })
      .from(teams)
      .where(eq(teams.leaderId, userIdToDelete));

    for (const team of ledTeams) {
      if (options.transferTeamsTo) {
        // Check if new leader is a team member
        const [membership] = await db
          .select()
          .from(teamMembers)
          .where(and(
            eq(teamMembers.teamId, team.id),
            eq(teamMembers.userId, options.transferTeamsTo)
          ));

        if (membership) {
          // Transfer leadership
          await db
            .update(teams)
            .set({ leaderId: options.transferTeamsTo })
            .where(eq(teams.id, team.id));
          transferredTeams.push(`${team.name} (to ${options.transferTeamsTo})`);
        } else if (options.deleteTeamsIfNoTransfer !== false) {
          // Delete team (cascade will handle members, applications, etc.)
          await db.delete(teams).where(eq(teams.id, team.id));
          deletedTeams.push(team.name);
        } else {
          return { 
            success: false, 
            error: `Cannot transfer team "${team.name}" - ${options.transferTeamsTo} is not a member` 
          };
        }
      } else if (options.deleteTeamsIfNoTransfer !== false) {
        // Delete team
        await db.delete(teams).where(eq(teams.id, team.id));
        deletedTeams.push(team.name);
      } else {
        return { 
          success: false, 
          error: `User is leader of team "${team.name}". Provide transferTeamsTo or set deleteTeamsIfNoTransfer=true` 
        };
      }
    }

    // 2. Remove user from all teams (as member)
    await db.delete(teamMembers).where(eq(teamMembers.userId, userIdToDelete));

    // 3. Delete join requests by user
    await db.delete(teamJoinRequests).where(eq(teamJoinRequests.userId, userIdToDelete));

    // 4. Delete challenge applications by user (via team membership)
    // These are already handled by cascade from team deletion or will be orphaned
    // But let's clean up any orphaned applications
    const userTeamIds = await db
      .select({ teamId: teamMembers.teamId })
      .from(teamMembers)
      .where(eq(teamMembers.userId, userIdToDelete))
      .then(rows => rows.map(r => r.teamId));

    if (userTeamIds.length > 0) {
      await db.delete(teamChallengeApplications)
        .where(inArray(teamChallengeApplications.teamId, userTeamIds));
    }

    // 5. Finally, delete the user (cascade handles accounts, sessions, etc.)
    await db.delete(users).where(eq(users.id, userIdToDelete));

    revalidatePath("/dashboard");

    return {
      success: true,
      message: `User ${user.email} (${user.name}) completely deleted`,
      deletedTeams,
      transferredTeams,
    };

  } catch (error) {
    console.error("Error deleting user:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to delete user" 
    };
  }
}

/**
 * Preview what will happen when deleting a user
 */
export async function previewUserDeletion(userIdToDelete: string) {
  const adminId = await requireAdminId();
  if (!adminId) return { error: "Not authorized" };

  const [user] = await db.select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(eq(users.id, userIdToDelete));
  
  if (!user) return { error: "User not found" };

  // Teams where user is leader
  const ledTeams = await db
    .select({ 
      id: teams.id, 
      name: teams.name,
      memberCount: db.$count(teamMembers, eq(teamMembers.teamId, teams.id))
    })
    .from(teams)
    .where(eq(teams.leaderId, userIdToDelete));

  // Teams where user is member
  const memberTeams = await db
    .select({ name: teams.name })
    .from(teamMembers)
    .innerJoin(teams, eq(teams.id, teamMembers.teamId))
    .where(eq(teamMembers.userId, userIdToDelete));

  return {
    user: { id: user.id, email: user.email, name: user.name },
    teamsAsLeader: ledTeams,
    teamsAsMember: memberTeams.map(t => t.name),
    summary: {
      willDeleteTeams: ledTeams.length,
      willLeaveTeams: memberTeams.length,
      affectedTeamMembers: ledTeams.reduce((sum, t) => sum + t.memberCount, 0),
    }
  };
}
