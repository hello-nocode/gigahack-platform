"use client";

import { useRef, useState } from "react";
import { Upload, X, Loader2 } from "lucide-react";

interface AvatarUploadProps {
  currentUrl?: string | null;
  name: string;
  onChange: (url: string) => void;
}

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;

export function AvatarUpload({ currentUrl, name, onChange }: AvatarUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5 MB.");
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", UPLOAD_PRESET);
      formData.append("folder", "avatars");

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        { method: "POST", body: formData },
      );

      if (!res.ok) throw new Error("Upload failed");

      const data = (await res.json()) as { secure_url: string };
      setPreview(data.secure_url);
      onChange(data.secure_url);
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function handleRemove() {
    setPreview(null);
    onChange("");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex items-start gap-5">
      {/* Avatar preview */}
      <div className="relative shrink-0">
        {preview ? (
          <>
            <img
              src={preview}
              alt="Avatar"
              className="h-20 w-20 rounded-full object-cover ring-2 ring-slate-600"
            />
            <button
              type="button"
              onClick={handleRemove}
              className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-500 transition-colors"
              title="Remove"
            >
              <X className="h-3 w-3" />
            </button>
          </>
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-slate-600 bg-slate-800 text-slate-500">
            {uploading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <Upload className="h-6 w-6" />
            )}
          </div>
        )}
      </div>

      {/* Drop zone / button */}
      <div
        className="flex flex-1 flex-col justify-center rounded-xl border border-dashed border-slate-600 bg-slate-800/40 px-5 py-4 transition-colors hover:border-slate-400"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <p className="text-sm font-medium text-slate-300">
          {uploading ? "Uploading…" : "Drag & drop or click to upload"}
        </p>
        <p className="mt-0.5 text-xs text-slate-500">PNG, JPG, WEBP · max 5 MB</p>
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-md bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-600 transition-colors disabled:opacity-50"
        >
          <Upload className="h-3.5 w-3.5" />
          {uploading ? "Uploading…" : "Choose file"}
        </button>
        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      </div>

      {/* Hidden inputs */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />
      {/* Stores the Cloudinary URL for the form submission */}
      <input type="hidden" name={name} value={preview ?? ""} />
    </div>
  );
}
