import { auth } from '@/auth';
import { apiClient } from '@/lib/api-client';
import { CreateCouponForm } from '@/components/admin/CreateCouponForm';
import { CouponActiveToggle } from '@/components/admin/CouponActiveToggle';

interface Coupon {
  id: string;
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: string;
  minSubtotal: string | null;
  maxUses: number | null;
  maxUsesPerAccount: number | null;
  active: boolean;
  validFrom: string | null;
  validUntil: string | null;
}

export default async function AdminCouponsPage() {
  const session = await auth();
  if (!session?.accessToken) return <p className="text-sm text-steel">Please sign in.</p>;

  const coupons = await apiClient.get<Coupon[]>('/v1/coupons', { accessToken: session.accessToken });

  return (
    <div>
      <h1 className="font-display text-xl font-bold mb-2">Coupons</h1>
      <p className="text-sm text-steel mb-6">
        Applied by customers on the cart page. Usage limits are enforced against real redemptions, not just a
        counter — see docs/AGENTS.md for how re-validation works on every cart price recalculation.
      </p>

      {coupons.length === 0 ? (
        <p className="text-sm text-steel mb-8">No coupons yet.</p>
      ) : (
        <table className="w-full text-sm mb-10">
          <thead>
            <tr className="text-left font-mono text-[10.5px] uppercase tracking-wide text-steel border-b border-black/10">
              <th className="pb-2 font-normal">Code</th>
              <th className="pb-2 font-normal">Discount</th>
              <th className="pb-2 font-normal">Limits</th>
              <th className="pb-2 font-normal">Valid</th>
              <th className="pb-2 font-normal">Status</th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((coupon) => (
              <tr key={coupon.id} className="border-b border-black/5">
                <td className="py-2.5 font-mono">{coupon.code}</td>
                <td className="py-2.5 text-steel">
                  {coupon.discountType === 'PERCENTAGE'
                    ? `${Number(coupon.discountValue)}%`
                    : `R${Number(coupon.discountValue).toFixed(2)}`}
                  {coupon.minSubtotal && ` (min R${Number(coupon.minSubtotal).toFixed(2)})`}
                </td>
                <td className="py-2.5 text-steel">
                  {coupon.maxUses ? `${coupon.maxUses} total` : 'Unlimited'}
                  {coupon.maxUsesPerAccount && `, ${coupon.maxUsesPerAccount}/customer`}
                </td>
                <td className="py-2.5 text-steel">
                  {coupon.validFrom ? new Date(coupon.validFrom).toLocaleDateString('en-ZA') : '—'} to{' '}
                  {coupon.validUntil ? new Date(coupon.validUntil).toLocaleDateString('en-ZA') : '—'}
                </td>
                <td className="py-2.5">
                  <CouponActiveToggle id={coupon.id} active={coupon.active} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2 className="text-base font-semibold mb-4">Create Coupon</h2>
      <CreateCouponForm />
    </div>
  );
}
