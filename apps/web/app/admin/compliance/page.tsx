import { IssueCoCForm } from '@/components/admin/IssueCoCForm';

export default function AdminCompliancePage() {
  return (
    <div>
      <h1 className="font-display text-xl font-bold mb-2">Issue Certificate of Compliance</h1>
      <p className="text-sm text-steel mb-6">
        Find the booking ID on the Bookings page. There&apos;s no document upload here yet — the
        certificate PDF needs to be uploaded to S3 separately and its URL pasted in below.
      </p>
      <IssueCoCForm />
    </div>
  );
}
