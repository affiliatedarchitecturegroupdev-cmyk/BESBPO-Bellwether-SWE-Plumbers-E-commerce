import { AdminNav } from '@/components/admin/AdminNav';

// No Header/Footer here — those are storefront chrome (see
// components/layout/Header.tsx). The admin panel is a genuinely different
// surface with its own nav, not a themed variant of the shop.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-[1100px] mx-auto px-8 py-10 flex gap-10">
      <AdminNav />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
