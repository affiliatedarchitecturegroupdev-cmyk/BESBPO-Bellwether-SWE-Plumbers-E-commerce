import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RequestReturnForm } from './RequestReturnForm';
import { createReturnRequestAction } from '@/lib/actions/return-actions';

jest.mock('@/lib/actions/return-actions', () => ({
  createReturnRequestAction: jest.fn(),
}));

const lineItems = [
  { id: 'oli-1', productName: 'Copper Pipe 15mm', quantity: 3 },
  { id: 'oli-2', productName: 'Ball Valve 15mm', quantity: 1 },
];

describe('RequestReturnForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts with exactly one item row', () => {
    render(<RequestReturnForm orderId="order-1" lineItems={lineItems} />);
    expect(screen.getAllByRole('combobox')).toHaveLength(2); // 1 item-select + 1 reason-select
  });

  it('adds a second item row when "Add another item" is clicked', async () => {
    const user = userEvent.setup();
    render(<RequestReturnForm orderId="order-1" lineItems={lineItems} />);

    await user.click(screen.getByRole('button', { name: /add another item/i }));

    expect(screen.getAllByRole('combobox')).toHaveLength(3);
  });

  it('lists every order line item as a selectable option, with its quantity shown', () => {
    render(<RequestReturnForm orderId="order-1" lineItems={lineItems} />);
    expect(screen.getByText('Copper Pipe 15mm (qty 3)')).toBeInTheDocument();
    expect(screen.getByText('Ball Valve 15mm (qty 1)')).toBeInTheDocument();
  });

  it('submits the selected line item, quantity, and reason correctly encoded in FormData', async () => {
    (createReturnRequestAction as jest.Mock).mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    render(<RequestReturnForm orderId="order-1" lineItems={lineItems} />);

    const [itemSelect, reasonSelect] = screen.getAllByRole('combobox');
    await user.selectOptions(itemSelect, 'oli-1');
    await user.selectOptions(reasonSelect, 'DEFECTIVE');
    await user.click(screen.getByRole('button', { name: /submit return request/i }));

    await waitFor(() => expect(createReturnRequestAction).toHaveBeenCalled());
    const [orderId, formData] = (createReturnRequestAction as jest.Mock).mock.calls[0];
    expect(orderId).toBe('order-1');
    expect(formData.get('itemCount')).toBe('1');
    expect(formData.get('items[0].orderLineItemId')).toBe('oli-1');
    expect(formData.get('items[0].quantity')).toBe('1');
    expect(formData.get('reason')).toBe('DEFECTIVE');
  });

  it('correctly encodes multiple rows with their own distinct indices', async () => {
    (createReturnRequestAction as jest.Mock).mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    render(<RequestReturnForm orderId="order-1" lineItems={lineItems} />);

    await user.click(screen.getByRole('button', { name: /add another item/i }));
    const comboboxes = screen.getAllByRole('combobox');
    await user.selectOptions(comboboxes[0], 'oli-1');
    await user.selectOptions(comboboxes[1], 'oli-2');
    await user.click(screen.getByRole('button', { name: /submit return request/i }));

    await waitFor(() => expect(createReturnRequestAction).toHaveBeenCalled());
    const [, formData] = (createReturnRequestAction as jest.Mock).mock.calls[0];
    expect(formData.get('itemCount')).toBe('2');
    expect(formData.get('items[0].orderLineItemId')).toBe('oli-1');
    expect(formData.get('items[1].orderLineItemId')).toBe('oli-2');
  });

  it('shows a success message and hides the form once submission succeeds', async () => {
    (createReturnRequestAction as jest.Mock).mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    render(<RequestReturnForm orderId="order-1" lineItems={lineItems} />);

    await user.selectOptions(screen.getAllByRole('combobox')[0], 'oli-1');
    await user.click(screen.getByRole('button', { name: /submit return request/i }));

    await waitFor(() => expect(screen.getByText(/return request submitted/i)).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /submit return request/i })).not.toBeInTheDocument();
  });

  it('shows the server-returned error and keeps the form visible when submission fails', async () => {
    (createReturnRequestAction as jest.Mock).mockResolvedValue({
      ok: false,
      error: "Only 2 unit(s) of 'Copper Pipe 15mm' are available to return",
    });
    const user = userEvent.setup();
    render(<RequestReturnForm orderId="order-1" lineItems={lineItems} />);

    await user.selectOptions(screen.getAllByRole('combobox')[0], 'oli-1');
    await user.click(screen.getByRole('button', { name: /submit return request/i }));

    await waitFor(() =>
      expect(screen.getByText(/Only 2 unit\(s\) of 'Copper Pipe 15mm' are available to return/)).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: /submit return request/i })).toBeInTheDocument();
  });
});
