import Image from 'next/image';
import { ProductImage } from '@/lib/types';

interface Props {
  image?: ProductImage;
  alt: string;
}

// A product with zero images is now a real, expected state (see
// schema.prisma's ProductImage model and docs/AGENTS.md) rather than
// something the frontend could previously paper over by assuming an S3
// object existed at a conventional path. This renders a plain placeholder
// instead of a broken image icon.
export function ProductImageOrPlaceholder({ image, alt }: Props) {
  if (!image) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#F3F4F5] text-steel">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="9" cy="9" r="2" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
      </div>
    );
  }

  return <Image src={image.url} alt={alt} fill className="object-cover" />;
}
