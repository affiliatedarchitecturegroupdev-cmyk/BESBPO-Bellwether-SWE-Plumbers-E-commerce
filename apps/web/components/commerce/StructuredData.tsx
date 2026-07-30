'use client';

import { Product } from '@/lib/types';

interface ProductStructuredDataProps {
  product: Product;
  brand?: string;
}

export function ProductStructuredData({ product, brand = 'Bellwether SWE Plumbers' }: ProductStructuredDataProps) {
  const productData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || `${product.name} — available from Bellwether SWE Plumbers`,
    brand: {
      '@type': 'Brand',
      name: product.brand || brand,
    },
    sku: product.sku,
    image: product.images?.length > 0 ? product.images.map((img) => img.url) : undefined,
    url: `https://bellwetherswe.shop/product/${product.slug}`,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'ZAR',
      price: product.retailPrice,
      availability: product.stockQty > 0
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: brand,
      },
    },
    aggregateRating: product.averageRating
      ? {
          '@type': 'AggregateRating',
          ratingValue: product.averageRating.toString(),
          reviewCount: product.reviewCount?.toString() || '0',
        }
      : undefined,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(productData) }}
    />
  );
}

interface OrganizationStructuredDataProps {
  name?: string;
  logo?: string;
  url?: string;
  email?: string;
  phone?: string;
  address?: {
    streetAddress: string;
    addressLocality: string;
    addressRegion: string;
    postalCode: string;
    addressCountry: string;
  };
}

export function OrganizationStructuredData({
  name = 'Bellwether SWE Plumbers',
  logo = '/logo.svg',
  url = 'https://bellwetherswe.shop',
  email = 'sales@bellwetherswe.shop',
  phone = '+27 11 555 0123',
  address = {
    streetAddress: '123 Industrial Street',
    addressLocality: 'Johannesburg',
    addressRegion: 'Gauteng',
    postalCode: '2000',
    addressCountry: 'ZA',
  },
}: OrganizationStructuredDataProps = {}) {
  const orgData = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name,
    url,
    logo,
    email,
    telephone: phone,
    address: {
      '@type': 'PostalAddress',
      ...address,
    },
    sameAs: [
      'https://www.facebook.com/bellwetherswe',
      'https://www.instagram.com/bellwetherswe',
      'https://www.linkedin.com/company/bellwetherswe',
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(orgData) }}
    />
  );
}

interface BreadcrumbStructuredDataProps {
  items: { name: string; url: string }[];
}

export function BreadcrumbStructuredData({ items }: BreadcrumbStructuredDataProps) {
  const breadcrumbData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }}
    />
  );
}

interface WebSiteStructuredDataProps {
  name?: string;
  url?: string;
}

export function WebSiteStructuredData({
  name = 'Bellwether SWE Plumbers',
  url = 'https://bellwetherswe.shop',
}: WebSiteStructuredDataProps = {}) {
  const siteData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name,
    url,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${url}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(siteData) }}
    />
  );
}
