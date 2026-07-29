import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { apiClient, ApiError } from '@/lib/api-client';

interface BookingDetail {
  id: string;
  sector: string;
  serviceCode: string;
  status: string;
  scheduledFor: string | null;
  siteAddress: string;
  notes: string | null;
  createdAt: string;
}

const dateFormatter = new Intl.DateTimeFormat('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });

interface Props {
  params: { id: string };
}

export default async function BookingDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.accessToken) {
    return <p className="max-w-[600px] mx-auto px-8 py-16 text-sm text-steel">Please sign in.</p>;
  }

  const booking = await fetchBooking(params.id, session.accessToken);
  if (!booking) notFound();

  return (
    <div className="max-w-[600px] mx-auto px-8 py-10">
      <h1 className="font-display text-xl font-bold mb-1">
        {booking.sector} — {booking.serviceCode}
      </h1>
      <p className="font-mono text-[11px] text-steel mb-8">{booking.status}</p>

      <dl className="space-y-3 text-sm">
        <Row label="Site Address" value={booking.siteAddress} />
        <Row
          label="Scheduled"
          value={booking.scheduledFor ? dateFormatter.format(new Date(booking.scheduledFor)) : 'Not yet scheduled'}
        />
        <Row label="Requested" value={dateFormatter.format(new Date(booking.createdAt))} />
        {booking.notes && <Row label="Notes" value={booking.notes} />}
      </dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2.5 border-b border-black/5">
      <dt className="text-steel">{label}</dt>
      <dd className="font-medium text-right">{value}</dd>
    </div>
  );
}

async function fetchBooking(id: string, accessToken: string): Promise<BookingDetail | null> {
  try {
    return await apiClient.get<BookingDetail>(`/v1/bookings/${id}`, { accessToken });
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 403)) return null;
    throw err;
  }
}
