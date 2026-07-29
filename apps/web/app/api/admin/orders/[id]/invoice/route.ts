import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

// Same proxy reasoning as the customer route
// (apps/web/app/api/orders/[id]/invoice/route.ts). This one additionally
// checks for orders:manage specifically, not just "any admin scope" —
// matching exactly what the underlying API endpoint
// (OrdersController.getInvoiceAdmin, @Scopes('orders:manage')) actually
// requires. Genuinely important here in a way the customer route isn't:
// getInvoicePdfAdmin has NO ownership check at all (any valid
// orders:manage token can fetch ANY order's invoice) — this check is UI-
// level courtesy, not the real security boundary (the API's own guard
// enforces this regardless, same principle as middleware.ts's own
// comment on /admin page access), but a clean, explicit early rejection
// is still worth having rather than relying solely on a 403 bubbling up
// from the proxied call.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.accessToken || !session.scopes?.includes('orders:manage')) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
  }

  const response = await fetch(`${API_URL}/v1/orders/admin/${params.id}/invoice`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });

  if (!response.ok) {
    return NextResponse.json({ error: 'Could not generate that invoice.' }, { status: response.status });
  }

  const pdf = await response.arrayBuffer();
  return new NextResponse(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': response.headers.get('Content-Disposition') ?? 'attachment; filename="invoice.pdf"',
    },
  });
}
