'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Paperclip,
  X,
  Send,
  Loader2,
  Image as ImageIcon,
} from 'lucide-react';
import Image from 'next/image';

interface MessageComposerProps {
  onSend: (text: string, files: File[]) => void;
  isLoading?: boolean;
  placeholder?: string;
}

export function MessageComposer({
  onSend,
  isLoading = false,
  placeholder = 'Write a message...',
}: MessageComposerProps) {
  const [text, setText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    const newFiles = Array.from(files).filter((file) => {
      if (file.size > 10 * 1024 * 1024) {
        alert(`${file.name} is too large (max 10MB)`);
        return false;
      }
      if (!allowedTypes.includes(file.type)) {
        alert(`${file.name} type not supported`);
        return false;
      }
      return true;
    });

    // Generate previews for images
    const newPreviews = [...imagePreviews];
    newFiles.forEach((file) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            newPreviews.push(e.target.result as string);
            setImagePreviews([...newPreviews]);
          }
        };
        reader.readAsDataURL(file);
      }
    });

    setSelectedFiles([...selectedFiles, ...newFiles]);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === containerRef.current) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items || items.length === 0) return;

    const files: File[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      try {
        // Handle file type clipboard items (most common for screenshots and pastes)
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file && file.size > 0) {
            // Auto-rename if no name provided
            const fileName = file.name || `pasted-image-${Date.now()}.png`;
            const renamedFile = new File([file], fileName, { type: file.type });
            files.push(renamedFile);
            console.log('✅ Pasted file:', fileName, file.type);
          }
        }
        // Handle direct image MIME types from clipboard
        else if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file && file.size > 0) {
            const ext = item.type === 'image/png' ? 'png' : item.type === 'image/jpeg' ? 'jpg' : 'png';
            const fileName = `pasted-image-${Date.now()}.${ext}`;
            const renamedFile = new File([file], fileName, { type: item.type });
            files.push(renamedFile);
            console.log('✅ Pasted image:', fileName, item.type);
          }
        }
      } catch (err) {
        console.error('Error processing clipboard item:', err);
      }
    }

    if (files.length > 0) {
      e.preventDefault();
      console.log('📎 Processing', files.length, 'pasted files');
      handleFileSelect({
        length: files.length,
        item: (i: number) => files[i],
      } as FileList);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);

    // Also remove preview if it's an image
    if (selectedFiles[index].type.startsWith('image/')) {
      const imageIndex = selectedFiles
        .slice(0, index)
        .filter((f) => f.type.startsWith('image/')).length;
      const newPreviews = imagePreviews.filter((_, i) => i !== imageIndex);
      setImagePreviews(newPreviews);
    }
  };

  const handleSend = () => {
    if (!text.trim() && selectedFiles.length === 0) return;

    onSend(text, selectedFiles);

    // Reset form
    setText('');
    setSelectedFiles([]);
    setImagePreviews([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSend();
    }
  };

  return (
    <div
      ref={containerRef}
      className={`flex flex-col gap-3 border-t pt-3 transition-colors relative ${
        isDragging ? 'bg-blue-50 dark:bg-blue-950/20' : ''
      }`}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag Over Indicator */}
      {isDragging && (
        <div className="absolute inset-0 border-2 border-dashed border-blue-500 rounded pointer-events-none flex items-center justify-center bg-blue-50/50 dark:bg-blue-950/10 z-10">
          <div className="flex flex-col items-center gap-2">
            <ImageIcon className="h-8 w-8 text-blue-500" />
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
              Drop files here
            </span>
          </div>
        </div>
      )}

      {/* Image Previews */}
      {imagePreviews.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {imagePreviews.map((preview, index) => (
            <div
              key={index}
              className="relative w-20 h-20 rounded-lg overflow-hidden border"
            >
              <img
                src={preview}
                alt={`Preview ${index}`}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* File List (non-images) */}
      {selectedFiles.some((f) => !f.type.startsWith('image/')) && (
        <div className="space-y-1 bg-gray-50 dark:bg-gray-900 rounded p-2">
          {selectedFiles
            .filter((f) => !f.type.startsWith('image/'))
            .map((file, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 px-2 py-1 rounded text-xs"
              >
                <Paperclip className="h-3 w-3 shrink-0" />
                <span className="flex-1 truncate">{file.name}</span>
                <span className="text-muted-foreground text-[10px]">
                  {(file.size / 1024).toFixed(0)}KB
                </span>
                <button
                  type="button"
                  onClick={() => removeFile(selectedFiles.indexOf(file))}
                  className="hover:text-red-500"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
        </div>
      )}

      {/* Input Area */}
      <div className="flex gap-2 items-end">
        {/* File Input Button */}
        <div className="relative">
          <input
            ref={fileInputRef}
            type="file"
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
            multiple
            accept={allowedTypes.join(',')}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="h-9 w-9"
            title="Attach files"
          >
            <Paperclip className="h-5 w-5" />
          </Button>
        </div>

        {/* Text Input */}
        <div className={`flex-1 min-h-9 ${isDragging ? 'opacity-50' : ''}`}>
          <Textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={placeholder}
            disabled={isLoading}
            className="resize-none max-h-24 min-h-9"
            rows={1}
          />
        </div>

        {/* Send Button */}
        <Button
          onClick={handleSend}
          disabled={(!text.trim() && selectedFiles.length === 0) || isLoading}
          className="h-9 w-9 p-0 shrink-0"
          title="Send message (Ctrl+Enter)"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>

      <div className="text-[10px] text-muted-foreground">
        💡 Drag files, paste images, or click 📎 to attach
      </div>
    </div>
  );
}
