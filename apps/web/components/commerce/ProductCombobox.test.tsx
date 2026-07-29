import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductCombobox } from './ProductCombobox';
import { apiClient } from '@/lib/api-client';

jest.mock('@/lib/api-client', () => ({
  apiClient: { get: jest.fn() },
}));

const PRODUCTS = {
  items: [
    { id: 'prod-1', name: '22mm Copper Elbow', sku: 'BSW-001' },
    { id: 'prod-2', name: '22mm Copper Coupling', sku: 'BSW-002' },
  ],
};

describe('ProductCombobox', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not search at all for a query shorter than the minimum length', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue(PRODUCTS);
    const user = userEvent.setup({ delay: null });
    render(<ProductCombobox onSelect={jest.fn()} />);

    await user.type(screen.getByPlaceholderText(/search products/i), 'a');
    jest.advanceTimersByTime(500);

    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it('searches via GET /v1/products?search= once the query reaches the minimum length, after debouncing', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue(PRODUCTS);
    const user = userEvent.setup({ delay: null });
    render(<ProductCombobox onSelect={jest.fn()} />);

    await user.type(screen.getByPlaceholderText(/search products/i), 'copper');
    jest.advanceTimersByTime(300);

    await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith('/v1/products?search=copper&pageSize=10'));
  });

  it('does not fire a new request on every keystroke — only once debounced', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue(PRODUCTS);
    const user = userEvent.setup({ delay: null });
    render(<ProductCombobox onSelect={jest.fn()} />);

    const input = screen.getByPlaceholderText(/search products/i);
    await user.type(input, 'c');
    jest.advanceTimersByTime(100);
    await user.type(input, 'o');
    jest.advanceTimersByTime(100);
    await user.type(input, 'p');
    jest.advanceTimersByTime(300);

    await waitFor(() => expect(apiClient.get).toHaveBeenCalledTimes(1));
  });

  it('calls onSelect with the chosen product and clears the input', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue(PRODUCTS);
    const onSelect = jest.fn();
    const user = userEvent.setup({ delay: null });
    render(<ProductCombobox onSelect={onSelect} />);

    await user.type(screen.getByPlaceholderText(/search products/i), 'copper');
    jest.advanceTimersByTime(300);

    await waitFor(() => expect(screen.getByText(/22mm Copper Elbow/)).toBeInTheDocument());
    await user.click(screen.getByText(/22mm Copper Elbow/));

    expect(onSelect).toHaveBeenCalledWith({ id: 'prod-1', name: '22mm Copper Elbow', sku: 'BSW-001' });
    expect((screen.getByPlaceholderText(/search products/i) as HTMLInputElement).value).toBe('');
  });

  it('excludes already-selected product IDs from the results shown', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue(PRODUCTS);
    const user = userEvent.setup({ delay: null });
    render(<ProductCombobox onSelect={jest.fn()} excludeIds={['prod-1']} />);

    await user.type(screen.getByPlaceholderText(/search products/i), 'copper');
    jest.advanceTimersByTime(300);

    await waitFor(() => expect(screen.getByText(/22mm Copper Coupling/)).toBeInTheDocument());
    expect(screen.queryByText(/22mm Copper Elbow/)).not.toBeInTheDocument();
  });

  it('shows a "no matching products" message when search returns nothing', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({ items: [] });
    const user = userEvent.setup({ delay: null });
    render(<ProductCombobox onSelect={jest.fn()} />);

    await user.type(screen.getByPlaceholderText(/search products/i), 'nonexistent');
    jest.advanceTimersByTime(300);

    await waitFor(() => expect(screen.getByText(/no matching products/i)).toBeInTheDocument());
  });
});
