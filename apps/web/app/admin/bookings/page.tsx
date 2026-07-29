import { auth } from '@/auth';
import { apiClient } from '@/lib/api-client';
import { Paginated } from '@/lib/types';
import { BookingStatusForm } from '@/components/admin/BookingStatusForm';

interface AdminBookingItem {
  id: string;
  sector: string;
  serviceCode: string;
  status: string;
  siteAddress: string;
  account: { email: string };
}

export default async function AdminBookingsPage() {
  const session = await auth();
  if (!session?.accessToken) return <p className="text-sm text-steel">Please sign in.</p>;

  const bookings = await apiClient.get<Paginated<AdminBookingItem>>('/v1/bookings/admin?pageSize=100', {
    accessToken: session.accessToken,
  });

  return (
    <div>
      <h1 className="font-display text-xl font-bold mb-6">Bookings</h1>

      {bookings.items.length === 0 ? (
        <p className="text-sm text-steel">No bookings yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left font-mono text-[10.5px] uppercase tracking-wide text-steel border-b border-black/10">
              <th className="pb-2 font-normal">Customer</th>
              <th className="pb-2 font-normal">Job</th>
              <th className="pb-2 font-normal">Site</th>
              <th className="pb-2 font-normal">Status</th>
            </tr>
          </thead>
          <tbody>
            {bookings.items.map((booking) => (
              <tr key={booking.id} className="border-b border-black/5">
                <td className="py-2.5 text-steel">{booking.account.email}</td>
                <td className="py-2.5">
                  {booking.sector} — {booking.serviceCode}
                  <div className="font-mono text-[10px] text-steel select-all">{booking.id}</div>
                </td>
                <td className="py-2.5 text-[#4A5157]">{booking.siteAddress}</td>
                <td className="py-2.5">
                  <BookingStatusForm bookingId={booking.id} currentStatus={booking.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
