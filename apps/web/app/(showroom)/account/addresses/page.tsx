import { auth } from '@/auth';
import { apiClient } from '@/lib/api-client';
import { Address } from '@/lib/types';
import { AddressCard } from '@/components/commerce/AddressCard';
import { createAddressAction } from '@/lib/actions/address-actions';
import { SubmitButton } from '@/components/admin/SubmitButton';

const PROVINCES = [
  'Eastern Cape',
  'Free State',
  'Gauteng',
  'KwaZulu-Natal',
  'Limpopo',
  'Mpumalanga',
  'Northern Cape',
  'North West',
  'Western Cape',
];

export default async function AddressesPage() {
  const session = await auth();
  if (!session?.accessToken) {
    return <p className="max-w-[700px] mx-auto px-8 py-16 text-sm text-steel">Please sign in.</p>;
  }

  const addresses = await apiClient.get<Address[]>('/v1/addresses', { accessToken: session.accessToken });

  return (
    <div className="max-w-[700px] mx-auto px-8 py-10">
      <h1 className="font-display text-2xl font-bold mb-8">Saved Addresses</h1>

      {addresses.length > 0 && (
        <div className="grid grid-cols-2 gap-4 mb-10">
          {addresses.map((address) => (
            <AddressCard key={address.id} address={address} />
          ))}
        </div>
      )}

      <h2 className="text-base font-semibold mb-4">Add a New Address</h2>
      <form action={createAddressAction} className="max-w-md">
        <div className="mb-4">
          <label className="block font-mono text-[10.5px] uppercase tracking-wide text-steel mb-1.5">
            Address Line 1
          </label>
          <input name="line1" required className="w-full border border-black/15 rounded-sm px-3 py-2 text-sm" />
        </div>
        <div className="mb-4">
          <label className="block font-mono text-[10.5px] uppercase tracking-wide text-steel mb-1.5">
            Address Line 2 (optional)
          </label>
          <input name="line2" className="w-full border border-black/15 rounded-sm px-3 py-2 text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block font-mono text-[10.5px] uppercase tracking-wide text-steel mb-1.5">City</label>
            <input name="city" required className="w-full border border-black/15 rounded-sm px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block font-mono text-[10.5px] uppercase tracking-wide text-steel mb-1.5">
              Postal Code
            </label>
            <input
              name="postalCode"
              required
              className="w-full border border-black/15 rounded-sm px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="mb-4">
          <label className="block font-mono text-[10.5px] uppercase tracking-wide text-steel mb-1.5">
            Province
          </label>
          <select name="province" required className="w-full border border-black/15 rounded-sm px-3 py-2 text-sm">
            {PROVINCES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm mb-6">
          <input type="checkbox" name="isDefault" />
          Set as default address
        </label>
        <SubmitButton>Save Address</SubmitButton>
      </form>
    </div>
  );
}
