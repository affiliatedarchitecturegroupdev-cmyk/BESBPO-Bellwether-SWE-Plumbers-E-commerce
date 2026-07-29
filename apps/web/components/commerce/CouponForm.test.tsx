import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CouponForm } from './CouponForm';
import { applyCouponAction, removeCouponAction } from '@/lib/actions/coupon-actions';

jest.mock('@/lib/actions/coupon-actions', () => ({
  applyCouponAction: jest.fn(),
  removeCouponAction: jest.fn(),
}));

const refresh = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}));

describe('CouponForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the apply form (input + button) when no coupon is currently applied', () => {
    render(<CouponForm couponCode={null} couponError={null} />);
    expect(screen.getByPlaceholderText('Coupon code')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument();
  });

  it('shows the applied coupon code and a Remove button instead of the form, once one is applied', () => {
    render(<CouponForm couponCode="SAVE10" couponError={null} />);
    expect(screen.getByText('SAVE10')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Coupon code')).not.toBeInTheDocument();
  });

  it('still shows the coupon code alongside its error reason, rather than hiding it — the customer can see WHY it stopped working', () => {
    render(<CouponForm couponCode="EXPIRED10" couponError="This coupon has expired" />);
    expect(screen.getByText('EXPIRED10')).toBeInTheDocument();
    expect(screen.getByText(/This coupon has expired/)).toBeInTheDocument();
  });

  it('submits the entered code to applyCouponAction', async () => {
    (applyCouponAction as jest.Mock).mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    render(<CouponForm couponCode={null} couponError={null} />);

    await user.type(screen.getByPlaceholderText('Coupon code'), 'SUMMER20');
    await user.click(screen.getByRole('button', { name: 'Apply' }));

    await waitFor(() => expect(applyCouponAction).toHaveBeenCalled());
    const [formData] = (applyCouponAction as jest.Mock).mock.calls[0];
    expect(formData.get('code')).toBe('SUMMER20');
  });

  it('shows the server-returned error when applying fails, without refreshing the router', async () => {
    (applyCouponAction as jest.Mock).mockResolvedValue({ ok: false, error: "Coupon code 'BADCODE' doesn't exist" });
    const user = userEvent.setup();
    render(<CouponForm couponCode={null} couponError={null} />);

    await user.type(screen.getByPlaceholderText('Coupon code'), 'BADCODE');
    await user.click(screen.getByRole('button', { name: 'Apply' }));

    await waitFor(() => expect(screen.getByText("Coupon code 'BADCODE' doesn't exist")).toBeInTheDocument());
    expect(refresh).not.toHaveBeenCalled();
  });

  it('calls removeCouponAction and refreshes on successful removal', async () => {
    (removeCouponAction as jest.Mock).mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    render(<CouponForm couponCode="SAVE10" couponError={null} />);

    await user.click(screen.getByRole('button', { name: 'Remove' }));

    await waitFor(() => expect(removeCouponAction).toHaveBeenCalled());
    expect(refresh).toHaveBeenCalled();
  });

  it('actually displays an error when removal fails — a real bug caught while writing this test: the applied-coupon view previously had no rendering of the local error state at all', async () => {
    (removeCouponAction as jest.Mock).mockResolvedValue({ ok: false, error: 'Could not remove the coupon' });
    const user = userEvent.setup();
    render(<CouponForm couponCode="SAVE10" couponError={null} />);

    await user.click(screen.getByRole('button', { name: 'Remove' }));

    await waitFor(() => expect(screen.getByText('Could not remove the coupon')).toBeInTheDocument());
    expect(refresh).not.toHaveBeenCalled();
  });
});
