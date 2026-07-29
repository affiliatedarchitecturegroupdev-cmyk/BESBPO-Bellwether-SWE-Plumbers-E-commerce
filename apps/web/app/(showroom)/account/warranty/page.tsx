import { auth } from '@/auth';
import { apiClient } from '@/lib/api-client';

interface WarrantyRecord {
  id: string;
  termMonths: number;
  issuedAt: string;
  expiresAt: string;
}

const dateFormatter = new Intl.DateTimeFormat('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });

export default async function WarrantyPage() {
  const session = await auth();
  if (!session?.accessToken) {
    return <p className="max-w-[600px] mx-auto px-8 py-16 text-sm text-steel">Please sign in.</p>;
  }

  const warranties = await apiClient.get<WarrantyRecord[]>('/v1/warranty', { accessToken: session.accessToken });

  return (
    <div className="max-w-[600px] mx-auto px-8 py-10">
      <h1 className="font-display text-2xl font-bold mb-8">Your Warranties</h1>

      {warranties.length === 0 ? (
        <p className="text-sm text-steel">No warranties on file yet — these are issued once a booking is completed.</p>
      ) : (
        <ul>
          {warranties.map((warranty) => {
            const isExpired = new Date(warranty.expiresAt) < new Date();
            return (
              <li key={warranty.id} className="border-b border-black/5 py-3.5">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{warranty.termMonths}-month warranty</span>
                  <span className={`font-mono text-[11px] ${isExpired ? 'text-red-600' : 'text-[#1E8E5A]'}`}>
                    {isExpired ? 'Expired' : 'Active'}
                  </span>
                </div>
                <p className="text-[12px] text-steel mt-0.5">
                  Issued {dateFormatter.format(new Date(warranty.issuedAt))} · Expires{' '}
                  {dateFormatter.format(new Date(warranty.expiresAt))}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
