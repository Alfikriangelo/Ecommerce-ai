// upload-form.tsx

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function UploadForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // State untuk Product ID sudah dihapus

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);

        // Validasi Product ID sudah dihapus

        if (!file) {
          setError("Please choose an image file first.");
          return;
        }
        if (!file.type.startsWith("image/")) {
          setError("Only image files are allowed.");
          return;
        }

        try {
          setIsUploading(true);
          const formData = new FormData();
          formData.append("file", file); // Hanya mengirim file

          const res = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });

          if (!res.ok) {
            const msg = await res
              .text()
              .catch(() => "Upload failed with no message.");
            throw new Error(msg);
          }

          const payload = (await res.json()) as { message: string };

          router.refresh();

          setSuccessMessage(`${payload.message} Redirecting...`);

          setTimeout(() => {
            router.push("/admin/products");
          }, 2000);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
          setIsUploading(false);
        }
      }}
    >
      {/* Input untuk Product ID sudah dihapus */}

      <div className="flex flex-col gap-2">
        <label htmlFor="product-image" className="text-sm font-medium">
          Product Image
        </label>
        <input
          id="product-image"
          name="product-image"
          type="file"
          accept="image/*"
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          aria-describedby="product-image-help"
          required
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <p id="product-image-help" className="text-xs text-muted-foreground">
          Choose a JPG or PNG image to upload. A new product will be created.
        </p>
      </div>

      {successMessage && (
        <p className="text-sm text-green-600">{successMessage}</p>
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex items-center gap-3">
        <Button
          type="submit"
          disabled={isUploading || !!successMessage}
          className="bg-[var(--color-chart-3)] text-[var(--color-primary-foreground)] hover:opacity-90 focus-visible:ring-[var(--color-chart-3)]"
        >
          {isUploading ? "Uploading..." : "Upload & Create Product"}
        </Button>
      </div>
    </form>
  );
}
