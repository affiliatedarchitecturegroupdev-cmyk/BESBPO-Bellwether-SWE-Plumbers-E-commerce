'use client';

import { useFormStatus } from 'react-dom';
import { Button } from '../ui/Button';

interface Props {
  children: string;
  pendingLabel?: string;
}

// useFormStatus only works inside the <form> it's meant to reflect, which
// is why this is its own component rather than inlined in every admin
// form — it reads context from the nearest parent <form>, not props.
export function SubmitButton({ children, pendingLabel = 'Saving…' }: Props) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" disabled={pending}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
