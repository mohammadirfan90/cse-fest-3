"use client";

import * as React from "react";
import { FileText, Video, ExternalLink, Calendar, HelpCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Submission {
  id: string;
  title: string;
  pdf_path: string;
  video_path: string | null;
  notes: string | null;
  status: string;
  submitted_at: string;
}

interface SubmissionDetailsCardProps {
  submission: Submission;
}

export function SubmissionDetailsCard({ submission }: SubmissionDetailsCardProps) {
  const [playVideo, setPlayVideo] = React.useState(false);

  return (
    <Card
      variant="glass"
      className={`font-sans border bg-glass border-glass transition-all duration-300 ${
        submission.status === "selected"
          ? "border-success/20 bg-success/5"
          : submission.status === "rejected"
          ? "border-error/20 bg-error/5"
          : submission.status === "under_review" || submission.status === "submitted"
          ? "border-warning/20 bg-warning/5"
          : "border-neutral-800/60 bg-neutral-900/10"
      }`}
    >
      <CardHeader className="flex flex-row justify-between items-start pb-4 border-b border-neutral-900">
        <div className="space-y-1">
          <CardTitle className="text-md font-heading font-semibold text-neutral-100">
            Roster Proposal Info
          </CardTitle>
          <div className="flex items-center gap-1.5 text-xxs text-neutral-500 font-mono">
            <Calendar className="h-3 w-3" />
            <span>Submitted: {new Date(submission.submitted_at).toLocaleString()}</span>
          </div>
        </div>
        <Badge
          variant={
            submission.status === "selected"
              ? "success"
              : submission.status === "rejected"
              ? "error"
              : submission.status === "under_review" || submission.status === "submitted"
              ? "warning"
              : "neutral"
          }
          className="capitalize font-mono"
        >
          {submission.status}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-5 pt-5">
        <div className="space-y-4">
          <div>
            <div className="text-sm text-neutral-500 font-bold uppercase tracking-wider">
              Proposal Title
            </div>
            <div className="text-sm text-neutral-100 font-semibold mt-1 bg-neutral-950/60 py-2.5 px-3 rounded-lg border border-neutral-850">
              {submission.title}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* PDF Row */}
            <div>
              <div className="text-sm text-neutral-500 font-bold uppercase tracking-wider mb-2">
                Project PDF Report
              </div>
              <a
                href={`/api/submissions/file/${submission.id}?type=pdf`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg border border-neutral-800 bg-neutral-950 text-xs text-neutral-200 hover:border-neutral-700 hover:bg-neutral-900/60 transition-all duration-150 font-mono uppercase tracking-wider font-semibold active:scale-[0.98]"
              >
                <FileText className="h-4 w-4 text-neutral-400" />
                <span>View Proposal PDF</span>
                <ExternalLink className="h-3 w-3 text-neutral-400" />
              </a>
            </div>

            {/* Video Row */}
            {submission.video_path && (
              <div>
                <div className="text-sm text-neutral-500 font-bold uppercase tracking-wider mb-2">
                  Demo Video
                </div>
                <button
                  type="button"
                  onClick={() => setPlayVideo(!playVideo)}
                  className="inline-flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg border border-neutral-800 bg-neutral-950 text-xs text-neutral-200 hover:border-neutral-700 hover:bg-neutral-900/60 transition-all duration-150 font-mono uppercase tracking-wider font-semibold active:scale-[0.98]"
                >
                  <Video className="h-4 w-4 text-neutral-400" />
                  <span>{playVideo ? "Hide Video Player" : "Play Demo Video"}</span>
                </button>
              </div>
            )}
          </div>

          {/* Inline Video Player */}
          {submission.video_path && playVideo && (
            <div className="border border-neutral-800 rounded-lg overflow-hidden bg-neutral-950/80 p-2 animate-fade-in">
              <video
                src={`/api/submissions/file/${submission.id}?type=video`}
                controls
                className="w-full aspect-video rounded border border-neutral-900 bg-black"
                preload="metadata"
              >
                Your browser does not support the video tag.
              </video>
            </div>
          )}

          {submission.notes && (
            <div>
              <div className="text-sm text-neutral-500 font-bold uppercase tracking-wider">
                Roster Notes
              </div>
              <div className="text-xs text-neutral-300 mt-1.5 leading-relaxed whitespace-pre-wrap bg-neutral-950/40 p-3.5 rounded-lg border border-neutral-850/60">
                {submission.notes}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
