import { IssueWarrantyForm } from '@/components/admin/IssueWarrantyForm';

export default function AdminWarrantyPage() {
  return (
    <div>
      <h1 className="font-display text-xl font-bold mb-2">Issue Warranty</h1>
      <p className="text-sm text-steel mb-6">
        Only for bookings marked COMPLETED — the API rejects anything else. Find the booking ID on the
        Bookings page.
      </p>
      <IssueWarrantyForm />
    </div>
  );
}
