import { MetadataRoute } from 'next';

const BASE_URL = 'https://bellwetherswe.shop';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Nothing here is useful for a search engine to index — account
      // pages are behind auth and empty to a crawler anyway, admin/trade
      // are internal, cart/checkout are transient per-user state.
      disallow: ['/account/', '/admin/', '/trade/', '/cart', '/checkout'],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
