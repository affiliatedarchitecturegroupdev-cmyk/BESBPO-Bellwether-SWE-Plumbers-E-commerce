import { auth } from '@/auth';
import { apiClient } from '@/lib/api-client';
import { CreateWarehouseForm } from '@/components/admin/CreateWarehouseForm';

interface Warehouse {
  id: string;
  name: string;
  streetAddress: string;
  city: string;
  province: string;
  postalCode: string;
}

export default async function AdminWarehousesPage() {
  const session = await auth();
  if (!session?.accessToken) return <p className="text-sm text-steel">Please sign in.</p>;

  const warehouses = await apiClient.get<Warehouse[]>('/v1/warehouses', { accessToken: session.accessToken });

  return (
    <div>
      <h1 className="font-display text-xl font-bold mb-2">Warehouses</h1>
      <p className="text-sm text-steel mb-6">
        Manage stock per location from a product&apos;s own edit page. Checkout itself has no location
        awareness yet — a sale decrements the total across every warehouse, not a specific one.
      </p>

      {warehouses.length === 0 ? (
        <p className="text-sm text-steel mb-8">No warehouses yet.</p>
      ) : (
        <table className="w-full text-sm mb-10">
          <thead>
            <tr className="text-left font-mono text-[10.5px] uppercase tracking-wide text-steel border-b border-black/10">
              <th className="pb-2 font-normal">Name</th>
              <th className="pb-2 font-normal">Address</th>
            </tr>
          </thead>
          <tbody>
            {warehouses.map((warehouse) => (
              <tr key={warehouse.id} className="border-b border-black/5">
                <td className="py-2.5">{warehouse.name}</td>
                <td className="py-2.5 text-steel">
                  {warehouse.streetAddress}, {warehouse.city}, {warehouse.province} {warehouse.postalCode}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2 className="text-base font-semibold mb-4">Add Warehouse</h2>
      <CreateWarehouseForm />
    </div>
  );
}
