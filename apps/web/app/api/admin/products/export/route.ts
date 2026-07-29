import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

// Same proxy reasoning as the order invoice admin route
// (apps/web/app/api/admin/orders/[id]/invoice/route.ts) — a plain <a
// href> can't carry a Bearer token, so this route fetches server-side
// with the session's own token and streams the result back. Checking
// for products:write here is UI-level courtesy, not the real security
// boundary — ProductsController.exportCsv's own @Scopes('products:write')
// enforces this regardless — but a clean, explicit early rejection is
// still worth having rather than relying solely on a 403 bubbling up
// from the proxied call.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.accessToken || !session.scopes?.includes('products:write')) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
  }

  const response = await fetch(`${API_URL}/v1/products/export`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });

  if (!response.ok) {
    return NextResponse.json({ error: 'Could not generate the export.' }, { status: response.status });
  }

  const csv = await response.arrayBuffer();
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition':
        response.headers.get('Content-Disposition') ?? 'attachment; filename="products-export.csv"',
    },
  });
}
