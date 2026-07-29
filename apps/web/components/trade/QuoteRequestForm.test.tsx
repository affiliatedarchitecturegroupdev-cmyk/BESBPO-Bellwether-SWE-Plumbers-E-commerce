import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuoteRequestForm } from './QuoteRequestForm';
import { createQuoteAction } from '@/lib/actions/quote-actions';
import { apiClient } from '@/lib/api-client';

jest.mock('@/lib/actions/quote-actions', () => ({
  createQuoteAction: jest.fn(),
}));

jest.mock('@/lib/api-client', () => ({
  apiClient: { get: jest.fn() },
}));

const push = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

describe('QuoteRequestForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (apiClient.get as jest.Mock).mockResolvedValue({
      items: [{ id: 'prod-1', name: 'Copper Pipe 15mm', sku: 'CPR-15' }],
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('blocks submission with a validation message when the description is too short', async () => {
    const user = userEvent.setup({ delay: null });
    render(<QuoteRequestForm />);

    await user.type(screen.getByPlaceholderText(/bulk copper fittings/i), 'too short');
    await user.click(screen.getByRole('button', { name: /submit request/i }));

    expect(screen.getByText(/describe what you need in a bit more detail/i)).toBeInTheDocument();
    expect(createQuoteAction).not.toHaveBeenCalled();
  });

  it('cannot remove the last remaining line item — the Remove button is disabled', () => {
    render(<QuoteRequestForm />);
    expect(screen.getByRole('button', { name: /remove/i })).toBeDisabled();
  });

  it('adding a row makes every Remove button enabled, including for the original row', async () => {
    const user = userEvent.setup({ delay: null });
    render(<QuoteRequestForm />);

    await user.click(screen.getByRole('button', { name: /add line item/i }));

    const removeButtons = screen.getAllByRole('button', { name: /remove/i });
    expect(removeButtons).toHaveLength(2);
    removeButtons.forEach((button) => expect(button).toBeEnabled());
  });

  it('unchecking "Catalog" on a row swaps the product search for a free-text description input', async () => {
    const user = userEvent.setup({ delay: null });
    render(<QuoteRequestForm />);

    expect(screen.getByPlaceholderText(/search products/i)).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox'));

    expect(screen.queryByPlaceholderText(/search products/i)).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText(/describe this line item/i)).toBeInTheDocument();
  });

  it("submits the searched-and-selected catalog product's own name as the item description, not a blank one", async () => {
    (createQuoteAction as jest.Mock).mockResolvedValue({ ok: true, quoteId: 'quote-1' });
    const user = userEvent.setup({ delay: null });
    render(<QuoteRequestForm />);

    await user.type(
      screen.getByPlaceholderText(/bulk copper fittings/i),
      'Need copper pipe for a renovation job',
    );
    await user.type(screen.getByPlaceholderText(/search products/i), 'copper');
    jest.advanceTimersByTime(300);
    await waitFor(() => expect(screen.getByText(/Copper Pipe 15mm/)).toBeInTheDocument());
    await user.click(screen.getByText(/Copper Pipe 15mm/));

    await user.click(screen.getByRole('button', { name: /submit request/i }));

    await waitFor(() => expect(createQuoteAction).toHaveBeenCalled());
    const [, items] = (createQuoteAction as jest.Mock).mock.calls[0];
    expect(items).toEqual([{ productId: 'prod-1', description: 'Copper Pipe 15mm', quantity: 1 }]);
  });

  it('navigates to the new quote on success (custom line item, no catalog search needed)', async () => {
    (createQuoteAction as jest.Mock).mockResolvedValue({ ok: true, quoteId: 'quote-42' });
    const user = userEvent.setup({ delay: null });
    render(<QuoteRequestForm />);

    await user.type(screen.getByPlaceholderText(/bulk copper fittings/i), 'A genuinely long enough description');
    await user.click(screen.getByRole('checkbox'));
    await user.type(screen.getByPlaceholderText(/describe this line item/i), 'Custom fabrication work');
    await user.click(screen.getByRole('button', { name: /submit request/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/trade/quotes/quote-42'));
  });

  it('shows the server-returned error and does not navigate when the action fails', async () => {
    (createQuoteAction as jest.Mock).mockResolvedValue({ ok: false, error: 'Something went wrong server-side' });
    const user = userEvent.setup({ delay: null });
    render(<QuoteRequestForm />);

    await user.type(screen.getByPlaceholderText(/bulk copper fittings/i), 'A genuinely long enough description');
    await user.click(screen.getByRole('checkbox'));
    await user.type(screen.getByPlaceholderText(/describe this line item/i), 'Custom fabrication work');
    await user.click(screen.getByRole('button', { name: /submit request/i }));

    await waitFor(() => expect(screen.getByText('Something went wrong server-side')).toBeInTheDocument());
    expect(push).not.toHaveBeenCalled();
  });
});
