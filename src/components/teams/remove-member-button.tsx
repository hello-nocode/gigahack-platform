"use client";

import { useState } from "react";
import { removeMember } from "@/lib/actions/teams";
import { UserMinus, Loader2 } from "lucide-react";

interface RemoveMemberButtonProps {
  teamId: string;
  memberId: string;
  memberName: string;
}

export function RemoveMemberButton({ teamId, memberId, memberName }: RemoveMemberButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!confirm(`Remove ${memberName} from the team? This cannot be undone.`)) return;
    setLoading(true);
    await removeMember(teamId, memberId);
    setLoading(false);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="text-slate-500 hover:text-red-400 transition-colors disabled:opacity-40"
      title={`Remove ${memberName}`}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <UserMinus className="h-4 w-4" />
      )}
    </button>
  );
}
