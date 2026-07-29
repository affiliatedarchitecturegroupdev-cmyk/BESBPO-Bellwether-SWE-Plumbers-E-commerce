import Link from 'next/link';
import { auth } from '@/auth';
import { apiClient } from '@/lib/api-client';
import { Paginated } from '@/lib/types';

interface BookingListItem {
  id: string;
  sector: string;
  serviceCode: string;
  status: string;
  scheduledFor: string | null;
  siteAddress: string;
  createdAt: string;
}

const dateFormatter = new Intl.DateTimeFormat('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });

const STATUS_STYLES: Record<string, string> = {
  REQUESTED: 'text-steel',
  SCHEDULED: 'text-hydra',
  IN_PROGRESS: 'text-hydra',
  COMPLETED: 'text-[#1E8E5A]',
  CANCELLED: 'text-red-600',
};

export default async function BookingsPage() {
  const session = await auth();
  if (!session?.accessToken) {
    return <p className="max-w-[700px] mx-auto px-8 py-16 text-sm text-steel">Please sign in.</p>;
  }

  const bookings = await apiClient.get<Paginated<BookingListItem>>('/v1/bookings?pageSize=50', {
    accessToken: session.accessToken,
  });

  return (
    <div className="max-w-[700px] mx-auto px-8 py-10">
      <div className="flex justify-between items-baseline mb-8">
        <h1 className="font-display text-2xl font-bold">Your Bookings</h1>
        <Link href="/account/bookings/new" className="font-mono text-[12px] text-hydra">
          + New Booking
        </Link>
      </div>

      {bookings.items.length === 0 ? (
        <p className="text-sm text-steel">You haven&apos;t requested any bookings yet.</p>
      ) : (
        <ul>
          {bookings.items.map((booking) => (
            <li key={booking.id} className="border-b border-black/5 py-3">
              <Link href={`/account/bookings/${booking.id}`} className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium">
                    {booking.sector} — {booking.serviceCode}
                  </p>
                  <p className="text-[12px] text-steel">{booking.siteAddress}</p>
                </div>
                <span className={`font-mono text-[11px] ${STATUS_STYLES[booking.status] ?? 'text-steel'}`}>
                  {booking.status}
                  {booking.scheduledFor && ` · ${dateFormatter.format(new Date(booking.scheduledFor))}`}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
