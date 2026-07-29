import { render, screen } from '@testing-library/react';
import { VariantSelector } from './VariantSelector';

describe('VariantSelector', () => {
  it('renders nothing at all for a single sibling — a "group" of one is not a real choice', () => {
    const { container } = render(
      <VariantSelector
        optionLabel="Size"
        currentSlug="copper-pipe-15mm"
        siblings={[{ slug: 'copper-pipe-15mm', variantValue: '15mm', stockQty: 10 }]}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for zero siblings', () => {
    const { container } = render(<VariantSelector optionLabel="Size" currentSlug="x" siblings={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a link for every sibling when there are two or more', () => {
    render(
      <VariantSelector
        optionLabel="Size"
        currentSlug="copper-pipe-15mm"
        siblings={[
          { slug: 'copper-pipe-15mm', variantValue: '15mm', stockQty: 10 },
          { slug: 'copper-pipe-22mm', variantValue: '22mm', stockQty: 5 },
        ]}
      />,
    );
    expect(screen.getByRole('link', { name: '15mm' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '22mm' })).toBeInTheDocument();
  });

  it('links each sibling to its own real product page, not a query-param swap', () => {
    render(
      <VariantSelector
        optionLabel="Size"
        currentSlug="copper-pipe-15mm"
        siblings={[
          { slug: 'copper-pipe-15mm', variantValue: '15mm', stockQty: 10 },
          { slug: 'copper-pipe-22mm', variantValue: '22mm', stockQty: 5 },
        ]}
      />,
    );
    expect(screen.getByRole('link', { name: '22mm' })).toHaveAttribute('href', '/product/copper-pipe-22mm');
  });

  it('marks the out-of-stock sibling as aria-disabled, but still renders it as a real, clickable link', () => {
    render(
      <VariantSelector
        optionLabel="Size"
        currentSlug="copper-pipe-15mm"
        siblings={[
          { slug: 'copper-pipe-15mm', variantValue: '15mm', stockQty: 10 },
          { slug: 'copper-pipe-22mm', variantValue: '22mm', stockQty: 0 },
        ]}
      />,
    );
    const outOfStockLink = screen.getByRole('link', { name: '22mm' });
    expect(outOfStockLink).toHaveAttribute('aria-disabled', 'true');
    expect(outOfStockLink).toHaveAttribute('href', '/product/copper-pipe-22mm');
  });
});
