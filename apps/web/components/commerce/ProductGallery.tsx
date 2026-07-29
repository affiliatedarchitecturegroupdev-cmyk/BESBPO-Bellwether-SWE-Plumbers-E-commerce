'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ProductImage } from '@/lib/types';
import { ProductImageOrPlaceholder } from './ProductImageOrPlaceholder';

interface Props {
  images: ProductImage[];
  productName: string;
}

// Client component specifically for the thumbnail click-to-select
// interaction — everything else on the product page is a server
// component. Handles the zero-images case (a real, expected state now,
// not an edge case) by falling back to ProductImageOrPlaceholder.
export function ProductGallery({ images, productName }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selected = images[selectedIndex];

  return (
    <div>
      <div className="aspect-square bg-[#F3F4F5] border border-black/10 relative mb-3">
        <ProductImageOrPlaceholder image={selected} alt={productName} />
      </div>
      {images.length > 1 && (
        <div className="grid grid-cols-4 gap-2.5">
          {images.map((image, i) => (
            <button
              key={image.id}
              onClick={() => setSelectedIndex(i)}
              className={`aspect-square bg-[#F3F4F5] border relative overflow-hidden ${
                i === selectedIndex ? 'border-hydra' : 'border-black/10'
              }`}
            >
              <Image src={image.url} alt="" fill className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
