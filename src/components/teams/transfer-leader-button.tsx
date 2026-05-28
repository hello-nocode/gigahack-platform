"use client";

import { useState } from "react";
import { transferLeadership } from "@/lib/actions/teams";
import { Crown, Loader2 } from "lucide-react";

interface TransferLeaderButtonProps {
  teamId: string;
  memberId: string;
  memberName: string;
}

export function TransferLeaderButton({ teamId, memberId, memberName }: TransferLeaderButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!confirm(`Make ${memberName} the team leader? You will become a regular member.`)) return;
    setLoading(true);
    await transferLeadership(teamId, memberId);
    setLoading(false);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="text-slate-500 hover:text-yellow-400 transition-colors disabled:opacity-40"
      title={`Make ${memberName} the leader`}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Crown className="h-4 w-4" />
      )}
    </button>
  );
}
