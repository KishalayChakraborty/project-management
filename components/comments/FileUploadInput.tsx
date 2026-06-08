'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Paperclip, X, Loader2, Image as ImageIcon } from 'lucide-react';

interface FileUploadInputProps {
  onFilesSelect?: (files: File[]) => void;
  isLoading?: boolean;
  maxFileSize?: number;
  maxFiles?: number;
}

export function FileUploadInput({
  onFilesSelect,
  isLoading = false,
  maxFileSize = 10 * 1024 * 1024,
  maxFiles = 5,
}: FileUploadInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  const validateFiles = (files: File[]): File[] => {
    const newErrors: string[] = [];
    const validFiles: File[] = [];

    if (selectedFiles.length + files.length > maxFiles) {
      newErrors.push(`Maximum ${maxFiles} files allowed`);
    }

    files.forEach((file) => {
      if (file.size > maxFileSize) {
        newErrors.push(
          `${file.name} exceeds ${maxFileSize / (1024 * 1024)}MB limit`
        );
      } else if (!allowedTypes.includes(file.type)) {
        newErrors.push(`${file.name} type not allowed`);
      } else {
        validFiles.push(file);
      }
    });

    setErrors(newErrors);
    return validFiles;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = validateFiles(files);
    const newFiles = [...selectedFiles, ...validFiles];
    setSelectedFiles(newFiles);
    onFilesSelect?.(newFiles);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files || []);
    const validFiles = validateFiles(files);
    const newFiles = [...selectedFiles, ...validFiles];
    setSelectedFiles(newFiles);
    onFilesSelect?.(newFiles);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const files: File[] = [];

    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        const file = items[i].getAsFile();
        if (file) files.push(file);
      }
    }

    if (files.length > 0) {
      const validFiles = validateFiles(files);
      const newFiles = [...selectedFiles, ...validFiles];
      setSelectedFiles(newFiles);
      onFilesSelect?.(newFiles);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    onFilesSelect?.(newFiles);
    setErrors([]);
  };

  const clearAll = () => {
    setSelectedFiles([]);
    setErrors([]);
    onFilesSelect?.([]);
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Drag and drop zone */}
      <div
        ref={dropZoneRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onPaste={handlePaste}
        className={`relative border-2 border-dashed rounded-lg p-3 transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          className="hidden"
          disabled={isLoading}
          multiple
          accept={allowedTypes.join(',')}
        />

        {selectedFiles.length === 0 ? (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="w-full flex flex-col items-center gap-2 py-2 cursor-pointer"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="flex gap-2 items-center text-xs text-muted-foreground">
                  <Paperclip className="h-4 w-4" />
                  <span>Drag files or</span>
                  <span className="underline">click to select</span>
                  <span>/ Paste images</span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  Max {maxFiles} files, 10MB each
                </span>
              </>
            )}
          </button>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">
                {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 text-xs"
                onClick={clearAll}
                disabled={isLoading}
                type="button"
              >
                Clear all
              </Button>
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {selectedFiles.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center gap-2 px-2 py-1 rounded bg-muted/30 text-xs"
                >
                  {file.type.startsWith('image/') ? (
                    <ImageIcon className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <Paperclip className="h-3.5 w-3.5 shrink-0" />
                  )}
                  <span className="flex-1 truncate">{file.name}</span>
                  <span className="text-[9px] text-muted-foreground shrink-0">
                    {(file.size / 1024).toFixed(0)}KB
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 p-0 shrink-0"
                    onClick={() => removeFile(index)}
                    disabled={isLoading}
                    type="button"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
            {selectedFiles.length < maxFiles && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-7 text-xs"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                type="button"
              >
                <Paperclip className="h-3 w-3 mr-1" />
                Add more files
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Error messages */}
      {errors.length > 0 && (
        <div className="space-y-1">
          {errors.map((error, index) => (
            <p key={index} className="text-xs text-destructive">
              ✗ {error}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
