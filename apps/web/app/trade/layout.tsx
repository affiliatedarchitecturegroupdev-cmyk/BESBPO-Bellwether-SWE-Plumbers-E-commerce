import { getCurrentAccount } from '@/lib/get-current-account';
import { TradeNav } from '@/components/trade/TradeNav';

// middleware.ts already requires a session for /trade/* — this adds the
// actual business check on top: is this session a TRADE account, not just
// any logged-in one. A retail account hitting /trade/* sees a plain
// message here rather than a confusing empty dashboard.
export default async function TradeLayout({ children }: { children: React.ReactNode }) {
  const account = await getCurrentAccount();

  if (account?.type !== 'TRADE') {
    return (
      <div className="max-w-[700px] mx-auto px-8 py-20 text-center">
        <h1 className="font-display text-xl font-bold mb-3">Trade Portal</h1>
        <p className="text-sm text-steel">
          This area is for registered trade accounts. Contact us if you&apos;d like to set one up.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-[1100px] mx-auto px-8 py-10 flex gap-10">
      <TradeNav />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
