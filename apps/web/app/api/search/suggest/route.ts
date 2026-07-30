import { NextResponse } from 'next/server';
import { apiClient } from '@/lib/api-client';

interface Suggestion {
  id: string;
  name: string;
  slug: string;
  category: string;
  type: 'product' | 'category' | 'brand';
}

/**
 * Search Suggestions API
 * 
 * Returns quick search suggestions as the user types.
 * Fetches from the API which combines product, category, and brand matches.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    // Fetch suggestions from API
    const results = await apiClient.get<{
      products: Array<{ id: string; name: string; slug: string; category: string }>;
      categories: Array<{ id: string; name: string; slug: string }>;
      brands: Array<{ name: string }>;
    }>(`/v1/search/suggest?q=${encodeURIComponent(query)}&limit=8`);

    const suggestions: Suggestion[] = [];

    // Add products
    if (results.products) {
      results.products.slice(0, 4).forEach((p) => {
        suggestions.push({
          id: p.id,
          name: p.name,
          slug: p.slug,
          category: p.category || 'Product',
          type: 'product',
        });
      });
    }

    // Add categories
    if (results.categories) {
      results.categories.slice(0, 2).forEach((c) => {
        suggestions.push({
          id: c.id,
          name: c.name,
          slug: c.slug,
          category: 'Category',
          type: 'category',
        });
      });
    }

    // Add brands
    if (results.brands) {
      results.brands.slice(0, 2).forEach((b) => {
        suggestions.push({
          id: b.name,
          name: b.name,
          slug: b.name.toLowerCase().replace(/\s+/g, '-'),
          category: 'Brand',
          type: 'brand',
        });
      });
    }

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('[Search Suggestions] Error:', error);
    // Return empty suggestions on error rather than breaking the UI
    return NextResponse.json({ suggestions: [] });
  }
}
