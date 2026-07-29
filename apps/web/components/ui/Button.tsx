import { ButtonHTMLAttributes, ReactNode } from 'react';
import Link from 'next/link';

type Variant = 'primary' | 'ghost' | 'shop';

interface BaseProps {
  variant?: Variant;
  children: ReactNode;
  className?: string;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-cyan text-ink hover:bg-[#4FE0CF]',
  ghost: 'border border-white/15 text-porcelain hover:border-cyan hover:text-cyan',
  shop: 'bg-hydra text-porcelain hover:bg-[#136fa6]',
};

const BASE_CLASSES =
  'inline-flex items-center gap-2 font-mono text-[13px] uppercase tracking-wide px-6 py-3.5 rounded-sm transition-colors';

// Two entry points sharing one visual language: Button for actions,
// ButtonLink for navigation — deliberately not one component branching on
// whether an href was passed, since that ends up with awkward prop typing
// for very little benefit.
export function Button({
  variant = 'primary',
  children,
  className = '',
  ...rest
}: BaseProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`${BASE_CLASSES} ${VARIANT_CLASSES[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = 'primary',
  children,
  className = '',
  href,
  ...rest
}: BaseProps & { href: string } & Omit<React.ComponentProps<typeof Link>, 'href' | 'className'>) {
  return (
    <Link href={href} className={`${BASE_CLASSES} ${VARIANT_CLASSES[variant]} ${className}`} {...rest}>
      {children}
    </Link>
  );
}
