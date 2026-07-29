import { render, screen } from '@testing-library/react';
import { PriceTag } from './PriceTag';

describe('PriceTag', () => {
  it('shows the retail price for a non-trade account with no sale', () => {
    render(<PriceTag retailPrice="100.00" tradePrice="85.00" isTradeAccount={false} />);
    expect(screen.getByText('R100.00')).toBeInTheDocument();
    expect(screen.getByText(/Trade: R85.00/)).toBeInTheDocument();
  });

  it('shows the trade price as primary for a trade account, with no separate trade callout', () => {
    render(<PriceTag retailPrice="100.00" tradePrice="85.00" isTradeAccount={true} />);
    expect(screen.getByText('R85.00')).toBeInTheDocument();
    expect(screen.queryByText(/Trade:/)).not.toBeInTheDocument();
  });

  it('shows the sale price plus a struck-through original when actively on sale', () => {
    render(
      <PriceTag retailPrice="100.00" tradePrice="85.00" salePrice="70.00" saleEndsAt={null} isTradeAccount={false} />,
    );
    expect(screen.getByText('R70.00')).toBeInTheDocument();
    expect(screen.getByText('R100.00')).toBeInTheDocument();
  });

  it('falls back to normal pricing when the sale has already expired', () => {
    const past = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString();
    render(
      <PriceTag retailPrice="100.00" tradePrice="85.00" salePrice="70.00" saleEndsAt={past} isTradeAccount={false} />,
    );
    expect(screen.queryByText('R70.00')).not.toBeInTheDocument();
    expect(screen.getByText('R100.00')).toBeInTheDocument();
  });

  it('shows the sale price against the trade price for a trade account on sale', () => {
    render(
      <PriceTag retailPrice="100.00" tradePrice="85.00" salePrice="70.00" saleEndsAt={null} isTradeAccount={true} />,
    );
    expect(screen.getByText('R70.00')).toBeInTheDocument();
    expect(screen.getByText('R85.00')).toBeInTheDocument();
  });
});
