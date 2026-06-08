'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

interface ImageAttachment {
  id: string;
  fileName: string;
  publicUrl: string;
}

interface MessageGalleryProps {
  images: ImageAttachment[];
  onClose?: () => void;
}

export function MessageGallery({ images, onClose }: MessageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const currentImage = images[selectedIndex];

  const goToPrevious = () => {
    setSelectedIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setSelectedIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const downloadImage = () => {
    const link = document.createElement('a');
    link.href = currentImage.publicUrl;
    link.download = currentImage.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:bg-white/20"
      >
        <X className="h-6 w-6" />
      </Button>

      {/* Main image */}
      <div className="relative w-full h-full max-w-4xl max-h-96 flex items-center justify-center">
        <img
          src={currentImage.publicUrl}
          alt={currentImage.fileName}
          className="max-w-full max-h-full object-contain"
        />
      </div>

      {/* Controls */}
      <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-4">
        {/* Previous button */}
        {images.length > 1 && (
          <Button
            variant="ghost"
            size="icon"
            onClick={goToPrevious}
            className="text-white hover:bg-white/20"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
        )}

        {/* Image counter */}
        <div className="text-white text-sm font-medium">
          {selectedIndex + 1} / {images.length}
        </div>

        {/* Next button */}
        {images.length > 1 && (
          <Button
            variant="ghost"
            size="icon"
            onClick={goToNext}
            className="text-white hover:bg-white/20"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        )}

        {/* Download button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={downloadImage}
          className="text-white hover:bg-white/20"
          title="Download image"
        >
          <Download className="h-5 w-5" />
        </Button>
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="absolute bottom-20 left-0 right-0 flex gap-2 justify-center px-4">
          {images.map((img, idx) => (
            <button
              key={img.id}
              onClick={() => setSelectedIndex(idx)}
              className={`relative w-16 h-16 rounded border-2 transition-all ${
                idx === selectedIndex
                  ? 'border-white'
                  : 'border-white/30 opacity-70 hover:opacity-100'
              }`}
            >
              <img
                src={img.publicUrl}
                alt={`Thumbnail ${idx + 1}`}
                className="w-full h-full object-cover rounded"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
