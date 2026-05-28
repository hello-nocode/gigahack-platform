"use client";

import { useState, useRef } from "react";
import { uploadTickets, deleteUnclaimedTickets } from "@/lib/actions/tickets";
import type { TicketUploadResult, TicketDeleteResult } from "@/lib/actions/tickets";
import { Upload, FileText, CheckCircle, AlertCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TicketUploadFormProps {
  eventId: string;
}

export function TicketUploadForm({ eventId }: TicketUploadFormProps) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<TicketUploadResult | null>(null);
  const [deleteResult, setDeleteResult] = useState<TicketDeleteResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    const content = await file.text();
    setText(content);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setUploading(true);
    setResult(null);
    setDeleteResult(null);
    const res = await uploadTickets(eventId, text);
    setResult(res);
    setUploading(false);
    if (res.success) setText("");
  }

  async function handleDeleteUnclaimed() {
    if (!confirm("Delete all unclaimed tickets for this event? Claimed tickets are kept. This cannot be undone.")) return;
    setDeleting(true);
    setDeleteResult(null);
    setResult(null);
    const res = await deleteUnclaimedTickets(eventId);
    setDeleteResult(res);
    setDeleting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* File drop / textarea */}
      <div
        className="relative rounded-xl border border-dashed border-slate-600 bg-slate-800/40 p-4 transition-colors hover:border-slate-400"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
      >
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium text-slate-300">Paste ticket numbers or upload a CSV</p>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 rounded-md bg-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-600 transition-colors"
          >
            <Upload className="h-3.5 w-3.5" /> Browse
          </button>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"TKT-001\nTKT-002\nTKT-003\n..."}
          rows={8}
          className="w-full rounded-md border border-slate-600 bg-slate-900/50 px-3 py-2 font-mono text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
        <p className="mt-1.5 text-xs text-slate-500">
          One ticket number per line. CSV files with a header row are supported — the header is skipped automatically.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.txt"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          disabled={uploading || !text.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
        >
          <FileText className="mr-2 h-4 w-4" />
          {uploading ? "Uploading…" : "Upload Tickets"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={deleting}
          onClick={handleDeleteUnclaimed}
          className="border-red-800 text-red-400 hover:bg-red-900/20 disabled:opacity-50"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {deleting ? "Deleting…" : "Delete unclaimed"}
        </Button>
      </div>

      {result && (
        <div className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${
          result.success
            ? "border-green-700/50 bg-green-900/20 text-green-300"
            : "border-red-700/50 bg-red-900/20 text-red-300"
        }`}>
          {result.success ? (
            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span>
            {result.success
              ? `✓ ${result.inserted} ticket${result.inserted !== 1 ? "s" : ""} added${result.skipped > 0 ? `, ${result.skipped} duplicate${result.skipped !== 1 ? "s" : ""} skipped` : ""}`
              : result.error}
          </span>
        </div>
      )}
      {deleteResult && (
        <div className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${
          deleteResult.success
            ? "border-orange-700/50 bg-orange-900/20 text-orange-300"
            : "border-red-700/50 bg-red-900/20 text-red-300"
        }`}>
          {deleteResult.success ? (
            <Trash2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span>
            {deleteResult.success
              ? `Deleted ${deleteResult.deleted} unclaimed ticket${deleteResult.deleted !== 1 ? "s" : ""}. Claimed tickets were kept.`
              : deleteResult.error}
          </span>
        </div>
      )}
    </form>
  );
}
