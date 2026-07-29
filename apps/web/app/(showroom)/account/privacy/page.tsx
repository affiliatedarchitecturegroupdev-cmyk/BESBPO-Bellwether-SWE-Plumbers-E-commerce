import { PrivacyControls } from '@/components/commerce/PrivacyControls';

export default function PrivacyPage() {
  return (
    <div className="max-w-[600px] mx-auto px-8 py-10">
      <h1 className="font-display text-2xl font-bold mb-2">Your Data</h1>
      <p className="text-sm text-steel mb-8">
        In line with POPIA, you can download a copy of your personal data or request that it be
        removed.
      </p>
      <PrivacyControls />
    </div>
  );
}
