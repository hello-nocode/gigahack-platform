"use client";

import { useState } from "react";
import { requestJoinTeam, cancelJoinRequest } from "@/lib/actions/teams";
import { Button } from "@/components/ui/button";
import { UserPlus, X } from "lucide-react";

interface RequestJoinButtonProps {
  teamId: string;
  existingRequestId?: string;
  existingStatus?: string;
}

export function RequestJoinButton({ teamId, existingRequestId, existingStatus }: RequestJoinButtonProps) {
  const [status, setStatus] = useState<string | undefined>(existingStatus);
  const [reqId, setReqId] = useState<string | undefined>(existingRequestId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRequest() {
    setLoading(true);
    setError(null);
    const result = await requestJoinTeam(teamId);
    if (result.error) {
      setError(result.error);
    } else {
      setStatus("pending");
    }
    setLoading(false);
  }

  async function handleCancel() {
    if (!reqId) return;
    setLoading(true);
    setError(null);
    const result = await cancelJoinRequest(reqId);
    if (result.error) {
      setError(result.error);
    } else {
      setStatus("cancelled");
      setReqId(undefined);
    }
    setLoading(false);
  }

  if (status === "accepted") {
    return <span className="text-xs text-green-400 font-medium">Member ✓</span>;
  }

  if (status === "rejected") {
    return <span className="text-xs text-red-400">Request rejected</span>;
  }

  if (status === "pending") {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-yellow-400">Pending</span>
        <button
          onClick={handleCancel}
          disabled={loading}
          className="text-slate-500 hover:text-red-400 transition-colors"
          title="Cancel request"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <Button
        type="button"
        size="sm"
        onClick={handleRequest}
        disabled={loading}
        className="h-7 px-3 text-xs bg-blue-600 hover:bg-blue-700"
      >
        <UserPlus className="mr-1 h-3 w-3" />
        {loading ? "Sending..." : "Request to Join"}
      </Button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
