import Link from 'next/link';
import { auth } from '@/auth';
import { apiClient } from '@/lib/api-client';
import { Paginated } from '@/lib/types';

interface AccountListItem {
  id: string;
  type: 'RETAIL' | 'TRADE';
  email: string;
  companyName: string | null;
  isGuest: boolean;
  createdAt: string;
}

interface Props {
  searchParams: { search?: string; type?: string; page?: string };
}

function buildPageHref(searchParams: Props['searchParams'], page: number): string {
  const params = new URLSearchParams();
  if (searchParams.search) params.set('search', searchParams.search);
  if (searchParams.type) params.set('type', searchParams.type);
  params.set('page', String(page));
  return `/admin/customers?${params.toString()}`;
}

// The admin-wide customer view that never existed anywhere in this
// codebase before — every other account-related endpoint was scoped to
// "me" (the current caller's own account). Search/filter driven by GET
// query params rather than client state, same pattern as the storefront
// search page — keeps the URL shareable/bookmarkable for a specific
// filtered view.
export default async function AdminCustomersPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.accessToken) {
    return <p className="text-sm text-steel">Please sign in.</p>;
  }

  const query = new URLSearchParams({ page: searchParams.page ?? '1', pageSize: '24' });
  if (searchParams.search) query.set('search', searchParams.search);
  if (searchParams.type) query.set('type', searchParams.type);

  const result = await apiClient.get<Paginated<AccountListItem>>(`/v1/accounts?${query.toString()}`, {
    accessToken: session.accessToken,
  });

  return (
    <div>
      <h1 className="font-display text-xl font-bold mb-2">Customers</h1>
      <p className="text-sm text-steel mb-6">{result.total} total accounts.</p>

      <form className="flex gap-3 mb-6">
        <input
          name="search"
          defaultValue={searchParams.search}
          placeholder="Search by email or company name"
          className="flex-1 border border-black/15 rounded-sm px-3 py-2 text-sm"
        />
        <select
          name="type"
          defaultValue={searchParams.type ?? ''}
          className="border border-black/15 rounded-sm px-3 py-2 text-sm"
        >
          <option value="">All account types</option>
          <option value="RETAIL">Retail</option>
          <option value="TRADE">Trade</option>
        </select>
        <button
          type="submit"
          className="font-mono text-[11px] uppercase tracking-wide bg-ink text-white px-4 py-2 rounded-sm"
        >
          Filter
        </button>
      </form>

      {result.items.length === 0 ? (
        <p className="text-sm text-steel">No accounts match this filter.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left font-mono text-[10.5px] uppercase tracking-wide text-steel border-b border-black/10">
              <th className="pb-2 font-normal">Email</th>
              <th className="pb-2 font-normal">Company</th>
              <th className="pb-2 font-normal">Type</th>
              <th className="pb-2 font-normal">Joined</th>
              <th className="pb-2 font-normal"></th>
            </tr>
          </thead>
          <tbody>
            {result.items.map((account) => (
              <tr key={account.id} className="border-b border-black/5">
                <td className="py-2.5">
                  {account.email}
                  {account.isGuest && <span className="ml-2 font-mono text-[10px] text-steel">GUEST</span>}
                </td>
                <td className="py-2.5 text-steel">{account.companyName ?? '—'}</td>
                <td className="py-2.5">
                  <span
                    className={`font-mono text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-sm ${
                      account.type === 'TRADE' ? 'bg-[#EAF3F8] text-hydra' : 'bg-black/5 text-steel'
                    }`}
                  >
                    {account.type}
                  </span>
                </td>
                <td className="py-2.5 text-steel">{new Date(account.createdAt).toLocaleDateString('en-ZA')}</td>
                <td className="py-2.5">
                  <Link href={`/admin/customers/${account.id}`} className="font-mono text-[11px] text-hydra">
                    View →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {result.total > result.pageSize && (
        <div className="flex gap-3 mt-6">
          {result.page > 1 && (
            <Link href={buildPageHref(searchParams, result.page - 1)} className="font-mono text-[11px] text-hydra">
              ← Previous
            </Link>
          )}
          {result.page * result.pageSize < result.total && (
            <Link href={buildPageHref(searchParams, result.page + 1)} className="font-mono text-[11px] text-hydra">
              Next →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
