import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WishlistButton } from './WishlistButton';
import { toggleWishlistAction } from '@/lib/actions/wishlist-actions';

jest.mock('@/lib/actions/wishlist-actions', () => ({
  toggleWishlistAction: jest.fn(),
}));

const refresh = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}));

describe('WishlistButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the empty heart and correct aria-label when not initially wishlisted', () => {
    render(<WishlistButton productId="prod-1" initiallyWishlisted={false} />);
    expect(screen.getByRole('button', { name: 'Save to wishlist' })).toHaveTextContent('♡');
  });

  it('renders the filled heart and correct aria-label when already wishlisted', () => {
    render(<WishlistButton productId="prod-1" initiallyWishlisted={true} />);
    expect(screen.getByRole('button', { name: 'Remove from wishlist' })).toHaveTextContent('♥');
  });

  it('calls toggleWishlistAction with the CURRENT (pre-toggle) state, not the state it is about to become', async () => {
    (toggleWishlistAction as jest.Mock).mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    render(<WishlistButton productId="prod-1" initiallyWishlisted={false} />);

    await user.click(screen.getByRole('button'));

    expect(toggleWishlistAction).toHaveBeenCalledWith('prod-1', false);
  });

  it('flips the displayed heart only AFTER a successful server response, and refreshes the router', async () => {
    (toggleWishlistAction as jest.Mock).mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    render(<WishlistButton productId="prod-1" initiallyWishlisted={false} />);

    await user.click(screen.getByRole('button'));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Remove from wishlist' })).toBeInTheDocument());
    expect(refresh).toHaveBeenCalled();
  });

  it('does NOT flip the displayed heart when the server action fails — no optimistic update, deliberately', async () => {
    (toggleWishlistAction as jest.Mock).mockResolvedValue({ ok: false, error: 'Please sign in to save items' });
    const user = userEvent.setup();
    render(<WishlistButton productId="prod-1" initiallyWishlisted={false} />);

    await user.click(screen.getByRole('button'));

    await waitFor(() => expect(screen.getByText('Please sign in to save items')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Save to wishlist' })).toHaveTextContent('♡');
    expect(refresh).not.toHaveBeenCalled();
  });

  it('shows a generic fallback error message when the action fails without its own error text', async () => {
    (toggleWishlistAction as jest.Mock).mockResolvedValue({ ok: false });
    const user = userEvent.setup();
    render(<WishlistButton productId="prod-1" initiallyWishlisted={false} />);

    await user.click(screen.getByRole('button'));

    await waitFor(() => expect(screen.getByText('Could not update your wishlist')).toBeInTheDocument());
  });
});
