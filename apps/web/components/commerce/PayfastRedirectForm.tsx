'use client';

import { useEffect, useRef } from 'react';

interface Props {
  actionUrl: string;
  fields: Record<string, string>;
}

// Rendered once checkout succeeds and PayFast's signed fields are known
// (see checkout-actions.ts). This isn't a visible form — it exists only to
// be submitted once, automatically, on mount. A plain redirect() can't do
// this: PayFast needs the signed fields delivered as a POST body, not
// query params on a GET.
export function PayfastRedirectForm({ actionUrl, fields }: Props) {
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    formRef.current?.submit();
  }, []);

  return (
    <form ref={formRef} action={actionUrl} method="POST" className="hidden">
      {Object.entries(fields).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
    </form>
  );
}
