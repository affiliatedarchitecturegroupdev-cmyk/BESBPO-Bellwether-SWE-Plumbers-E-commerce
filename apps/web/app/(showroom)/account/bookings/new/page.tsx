import { BookingRequestForm } from '@/components/commerce/BookingRequestForm';

export default function NewBookingPage() {
  return (
    <div className="max-w-[600px] mx-auto px-8 py-10">
      <h1 className="font-display text-2xl font-bold mb-2">Request a Booking</h1>
      <p className="text-sm text-steel mb-8">
        Tell us what&apos;s going on and we&apos;ll get a technician out to you.
      </p>
      <BookingRequestForm />
    </div>
  );
}
