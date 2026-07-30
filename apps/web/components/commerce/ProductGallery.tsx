'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { ProductImage } from '@/lib/types';
import { ProductImageOrPlaceholder } from './ProductImageOrPlaceholder';

interface Props {
  images: ProductImage[];
  productName: string;
}

// Client component for product image gallery with lightbox support
// Handles thumbnail click-to-select and opens fullscreen lightbox on main image click
export function ProductGallery({ images, productName }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const selected = images[selectedIndex];

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!isLightboxOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case 'ArrowLeft':
          setSelectedIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
          break;
        case 'ArrowRight':
          setSelectedIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
          break;
        case 'Escape':
          setIsLightboxOpen(false);
          break;
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isLightboxOpen, images.length]);

  return (
    <div>
      {/* Main Image with Lightbox Trigger */}
      <div className="aspect-square bg-[#F3F4F5] border border-black/10 relative mb-3 group">
        <ProductImageOrPlaceholder image={selected} alt={productName} />
        
        {/* Lightbox Trigger Overlay */}
        <button
          onClick={() => setIsLightboxOpen(true)}
          className="absolute inset-0 flex items-center justify-center bg-ink/0 hover:bg-ink/10 transition-colors"
          aria-label="View fullscreen image"
        >
          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-ink/80 text-porcelain p-3 rounded-full">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
            </svg>
          </div>
        </button>
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="grid grid-cols-4 gap-2.5">
          {images.map((image, i) => (
            <button
              key={image.id}
              onClick={() => setSelectedIndex(i)}
              className={`aspect-square bg-[#F3F4F5] border relative overflow-hidden transition-all ${
                i === selectedIndex ? 'border-hydra ring-2 ring-hydra/20' : 'border-black/10 hover:border-steel'
              }`}
            >
              <Image src={image.url} alt="" fill className="object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox Modal */}
      {isLightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-ink/95 flex items-center justify-center"
          onClick={() => setIsLightboxOpen(false)}
        >
          {/* Close Button */}
          <button
            onClick={() => setIsLightboxOpen(false)}
            className="absolute top-4 right-4 text-porcelain hover:text-cyan transition-colors z-10 p-2"
            aria-label="Close lightbox"
          >
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Image Counter */}
          <div className="absolute top-4 left-4 font-mono text-[11px] text-steel">
            {selectedIndex + 1} / {images.length}
          </div>

          {/* Navigation Arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-porcelain hover:text-cyan transition-colors p-2 hover:bg-white/5 rounded-full"
                aria-label="Previous image"
              >
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-porcelain hover:text-cyan transition-colors p-2 hover:bg-white/5 rounded-full"
                aria-label="Next image"
              >
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}

          {/* Main Image */}
          <div
            className="relative max-w-[90vw] max-h-[85vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={images[selectedIndex].url}
              alt={`${productName} - Image ${selectedIndex + 1}`}
              width={800}
              height={800}
              className="max-w-full max-h-[85vh] object-contain"
              priority
            />
          </div>

          {/* Thumbnail Strip */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 p-2 bg-ink-2/80 rounded-sm max-w-[90vw] overflow-x-auto">
              {images.map((image, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedIndex(index);
                  }}
                  className={`w-12 h-12 relative rounded overflow-hidden border-2 transition-colors flex-shrink-0 ${
                    index === selectedIndex ? 'border-cyan' : 'border-transparent hover:border-white/30'
                  }`}
                  aria-label={`View image ${index + 1}`}
                >
                  <Image src={image.url} alt="" fill className="object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Keyboard Hint */}
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 text-steel text-xs font-mono hidden sm:block">
            ← → to navigate • ESC to close
          </div>
        </div>
      )}
    </div>
  );
}
