import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

// Proxies the binary PDF response server-side, attaching the session's
// own Bearer token — a plain <a href> link straight to apps/api's own
// endpoint couldn't do this, since browsers don't attach custom
// Authorization headers to a simple navigation. The underlying API
// endpoint (GET /v1/orders/:id/invoice) still does its own ownership
// check regardless (see OrdersService.getInvoicePdf) — this route's own
// session check is a clean, early rejection for a signed-out visitor,
// not the actual security boundary.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  }

  const response = await fetch(`${API_URL}/v1/orders/${params.id}/invoice`, {
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
