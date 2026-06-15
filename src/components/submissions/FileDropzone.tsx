"use client";

import * as React from "react";
import { UploadCloud, FileText, Video, X, AlertCircle } from "lucide-react";

interface FileDropzoneProps {
  label: string;
  accept: string;
  maxSizeMB: number;
  required?: boolean;
  value?: File | null;
  onChange: (file: File | null) => void;
  helperText?: string;
  disabled?: boolean;
}

export function FileDropzone({
  label,
  accept,
  maxSizeMB,
  required = false,
  value,
  onChange,
  helperText,
  disabled = false,
}: FileDropzoneProps) {
  const [isDragActive, setIsDragActive] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const isVideo = accept.startsWith("video/");
  const Icon = isVideo ? Video : FileText;

  const validateAndSetFile = (file: File) => {
    setError(null);

    // Validate size
    const sizeInMB = file.size / (1024 * 1024);
    if (sizeInMB > maxSizeMB) {
      setError(`File size exceeds the limit of ${maxSizeMB} MB.`);
      onChange(null);
      return;
    }

    // Validate mime/type basically
    const fileType = file.type;
    if (isVideo && !fileType.startsWith("video/")) {
      setError("Please select a valid video file.");
      onChange(null);
      return;
    }
    if (!isVideo && accept === "application/pdf" && fileType !== "application/pdf") {
      setError("Please select a valid PDF document.");
      onChange(null);
      return;
    }

    onChange(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;

    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (disabled) return;

    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const clearFile = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    setError(null);
    onChange(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col space-y-1.5 w-full font-sans">
      <div className="flex justify-between items-center select-none">
        <label className="text-sm font-medium text-neutral-350">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {maxSizeMB && (
          <span className="text-xxs text-neutral-500 font-mono">Max: {maxSizeMB}MB</span>
        )}
      </div>

      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={onButtonClick}
        className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 transition-all duration-200 cursor-pointer ${
          isDragActive
            ? "border-neutral-500 bg-neutral-900/40 scale-[1.01]"
            : "border-neutral-800 bg-neutral-950 hover:border-neutral-700 hover:bg-neutral-900/20"
        } ${disabled ? "opacity-50 pointer-events-none bg-neutral-900/50" : ""}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          disabled={disabled}
          className="hidden"
        />

        {value ? (
          <div className="flex items-center justify-between w-full p-2 bg-neutral-900/60 border border-neutral-800 rounded-lg animate-fade-in">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 shrink-0 rounded bg-neutral-950/40 border border-neutral-800 flex items-center justify-center text-neutral-400">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-neutral-200 truncate pr-4">
                  {value.name}
                </div>
                <div className="text-xxs text-neutral-500 font-mono mt-0.5">
                  {(value.size / (1024 * 1024)).toFixed(2)} MB
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={clearFile}
              className="p-1 rounded bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center space-y-2 select-none">
            <div className="h-10 w-10 rounded-full bg-neutral-900/80 border border-neutral-800 flex items-center justify-center text-neutral-400">
              <UploadCloud className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-neutral-300 font-semibold">
                Drag & drop files or <span className="text-neutral-50 hover:underline">browse</span>
              </p>
              <p className="text-xxs text-neutral-500 mt-1">
                {helperText || `Select a valid ${isVideo ? "video" : "PDF"} file`}
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-red-500 mt-1 font-medium bg-red-950/10 border border-red-950/20 p-2 rounded-lg">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
