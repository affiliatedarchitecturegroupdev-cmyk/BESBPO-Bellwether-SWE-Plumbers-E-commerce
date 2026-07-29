'use client';

import { useRef, useState, useTransition } from 'react';
import Image from 'next/image';
import { ProductImage } from '@/lib/types';
import {
  confirmProductImageAction,
  deleteProductImageAction,
  requestProductImageUploadAction,
} from '@/lib/actions/admin-products';

interface Props {
  productId: string;
  images: ProductImage[];
}

// The only piece of the upload flow that genuinely needs to run in the
// browser: PUTting the actual file bytes to S3 via fetch. Everything
// around it (getting the presigned URL, confirming afterward) is a server
// action — this component is client-side specifically because of that one
// fetch call, not as a default choice.
export function ProductImageUploader({ productId, images }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    startTransition(async () => {
      try {
        const { uploadUrl, key } = await requestProductImageUploadAction(productId, file.type);

        const uploadRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
        });
        if (!uploadRes.ok) {
          throw new Error(`Upload to storage failed (${uploadRes.status})`);
        }

        await confirmProductImageAction(productId, key);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    });
  }

  function handleDelete(imageId: string) {
    startTransition(async () => {
      const result = await deleteProductImageAction(imageId, productId);
      if (!result.ok) setError(result.error ?? 'Delete failed');
    });
  }

  return (
    <div>
      <div className="grid grid-cols-4 gap-3 mb-4">
        {images.map((image) => (
          <div key={image.id} className="relative aspect-square border border-black/10">
            <Image src={image.url} alt="" fill className="object-cover" />
            <button
              onClick={() => handleDelete(image.id)}
              disabled={isPending}
              className="absolute top-1 right-1 bg-ink/80 text-white text-[10px] font-mono px-1.5 py-0.5 rounded-sm"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <label className="inline-block">
        <span className="font-mono text-[11px] uppercase tracking-wide text-hydra cursor-pointer">
          {isPending ? 'Uploading…' : '+ Add image'}
        </span>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileSelected}
          disabled={isPending}
          className="hidden"
        />
      </label>
      {error && <p className="text-[11.5px] text-red-600 mt-2">{error}</p>}
    </div>
  );
}
