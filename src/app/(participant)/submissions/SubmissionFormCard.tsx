"use client";

import * as React from "react";
import { Send } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileDropzone } from "@/components/submissions/FileDropzone";

interface SubmissionFormCardProps {
  initialTitle?: string;
  initialNotes?: string;
  initialYoutubeDemoUrl?: string;
  onSubmit: (formData: FormData) => Promise<void>;
  formLoading: boolean;
  isUpdate?: boolean;
  /** Upload progress percentage (0–100). When > 0 and < 100, a progress bar is shown. */
  uploadProgress?: number;
}

export function SubmissionFormCard({
  initialTitle = "",
  initialNotes = "",
  initialYoutubeDemoUrl = "",
  onSubmit,
  formLoading,
  isUpdate = false,
  uploadProgress = 0,
}: SubmissionFormCardProps) {
  const [title, setTitle] = React.useState(initialTitle);
  const [notes, setNotes] = React.useState(initialNotes);
  const [pdfFile, setPdfFile] = React.useState<File | null>(null);
  const [youtubeDemoUrl, setYoutubeDemoUrl] = React.useState(initialYoutubeDemoUrl);
  const [youtubeError, setYoutubeError] = React.useState<string | null>(null);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formLoading) return;

    // Validate YouTube URL
    if (youtubeDemoUrl && youtubeDemoUrl.trim()) {
      const trimmedUrl = youtubeDemoUrl.trim();
      const regex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)/;
      if (!regex.test(trimmedUrl)) {
        setYoutubeError("Please enter a valid YouTube URL (youtube.com/watch?v=, youtu.be/, or youtube.com/embed/).");
        return;
      }
    }
    setYoutubeError(null);

    const formData = new FormData();
    formData.append("title", title);
    if (notes) {
      formData.append("notes", notes);
    }
    if (pdfFile) {
      formData.append("pdf", pdfFile);
    }
    if (youtubeDemoUrl && youtubeDemoUrl.trim()) {
      formData.append("youtube_demo_url", youtubeDemoUrl.trim());
    }

    await onSubmit(formData);

    // If successfully submitted a new entry, clear inputs
    if (!isUpdate) {
      setPdfFile(null);
      setYoutubeDemoUrl("");
    }
  };

  const isUploading = formLoading && uploadProgress > 0 && uploadProgress < 100;
  const isProcessing = formLoading && uploadProgress >= 100;

  return (
    <Card variant="glass" className="bg-glass border-glass font-sans">
      <CardHeader>
        <CardTitle className="text-md font-heading font-semibold text-neutral-100">
          {isUpdate ? "Update Submission Configuration" : "Submit Project Proposal"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Project Title"
            placeholder="e.g. Smart IoT Agriculture Tracker"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={formLoading}
            required
            className="w-full"
          />

          <FileDropzone
            label="Project PDF Report"
            accept="application/pdf"
            maxSizeMB={5}
            required={!isUpdate} // Optional on update, required on new
            value={pdfFile}
            onChange={setPdfFile}
            helperText="Upload your project proposal in PDF format"
            disabled={formLoading}
          />

          <Input
            label="Project Demo Video Link"
            placeholder="https://youtube.com/watch?v=..."
            value={youtubeDemoUrl}
            onChange={(e) => {
              setYoutubeDemoUrl(e.target.value);
              if (youtubeError) setYoutubeError(null);
            }}
            error={youtubeError || undefined}
            disabled={formLoading}
            helperText="Provide an Unlisted YouTube video link demonstrating your project. The video should clearly explain the problem, solution, features, and working demonstration of the project."
          />

          {/* Upload Progress Bar */}
          {formLoading && uploadProgress > 0 && (
            <div className="space-y-2 p-3 bg-neutral-950/60 border border-neutral-850 rounded-lg animate-fade-in">
              <div className="flex items-center justify-between text-sm font-mono">
                <span className="text-neutral-400 font-semibold">
                  {isProcessing ? "Processing submission..." : "Uploading files..."}
                </span>
                <span className="text-neutral-300 font-bold tabular-nums">
                  {Math.min(Math.round(uploadProgress), 100)}%
                </span>
              </div>
              <div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300 ease-out"
                  style={{
                    width: `${Math.min(uploadProgress, 100)}%`,
                    background: isProcessing
                      ? "linear-gradient(90deg, var(--color-success), var(--color-success))"
                      : "linear-gradient(90deg, var(--color-primary), var(--color-accent))",
                  }}
                />
              </div>
              {isUploading && (
                <p className="text-sm text-neutral-500 font-sans">
                  Please keep this tab open until the upload completes.
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col space-y-1.5">
            <label className="text-sm font-medium text-neutral-350 select-none">
              Additional Notes (Optional)
            </label>
            <textarea
              rows={4}
              placeholder="Provide details about system constraints, hardware, or tech stack..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={formLoading}
              className="flex w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm text-neutral-50 placeholder:text-neutral-600 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all duration-200 resize-none leading-relaxed font-sans disabled:opacity-50"
            />
          </div>

          <Button
            variant="primary"
            type="submit"
            isLoading={formLoading}
            disabled={formLoading || (!isUpdate && !pdfFile)}
            className="w-full justify-center py-2.5 font-semibold active:scale-[0.99] transition-all flex items-center gap-2"
          >
            <Send className="h-4 w-4" />
            <span>{isUpdate ? "Update Submission" : "Submit Proposal"}</span>
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
