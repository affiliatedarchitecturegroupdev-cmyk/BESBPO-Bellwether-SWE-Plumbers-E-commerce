'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { bulkImportProductsAction, BulkImportError } from '@/lib/actions/bulk-import-products';

export function BulkImportExportPanel() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<BulkImportError[] | null>(null);
  const [success, setSuccess] = useState<{ created: number; updated: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setRowErrors(null);
    setSuccess(null);

    const reader = new FileReader();
    reader.onload = () => {
      const csvContent = reader.result as string;
      startTransition(async () => {
        const result = await bulkImportProductsAction(csvContent);
        if (!result.ok) {
          if (result.errors && result.errors.length > 0) {
            setRowErrors(result.errors);
          } else {
            setError(result.error ?? 'Import failed');
          }
          return;
        }
        setSuccess({ created: result.created ?? 0, updated: result.updated ?? 0 });
        router.refresh();
      });
    };
    reader.readAsText(file);

    // Allow re-selecting the same file name after a failed attempt is
    // fixed and re-uploaded, without needing to pick a different file.
    e.target.value = '';
  }

  return (
    <div className="border border-black/10 rounded-sm p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold">Bulk Import / Export</h2>
          <p className="text-[12.5px] text-steel">
            Export the full catalog to edit offline, then re-import — the export&apos;s own column format is a
            valid import file as-is. An import is rejected entirely if any row is invalid; nothing is created or
            updated until every row passes.
          </p>
        </div>
      </div>

      <div className="flex gap-3 items-center">
        <a
          href="/api/admin/products/export"
          className="font-mono text-[11px] uppercase tracking-wide border border-black/15 rounded-sm px-3 py-1.5"
        >
          Download CSV Export
        </a>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isPending}
          className="font-mono text-[11px] uppercase tracking-wide bg-ink text-white px-3 py-1.5 rounded-sm disabled:opacity-60"
        >
          {isPending ? 'Importing…' : 'Upload CSV to Import'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileSelected}
          className="hidden"
        />
      </div>

      {success && (
        <p className="text-[13px] text-[#1E8E5A] mt-3">
          Import complete — {success.created} product{success.created === 1 ? '' : 's'} created,{' '}
          {success.updated} updated.
        </p>
      )}

      {error && <p className="text-[13px] text-red-600 mt-3">{error}</p>}

      {rowErrors && (
        <div className="mt-3">
          <p className="text-[13px] text-red-600 mb-2">
            Import rejected — {rowErrors.length} row{rowErrors.length === 1 ? '' : 's'} failed validation. Nothing
            was created or updated; fix these and re-upload.
          </p>
          <ul className="text-[12px] max-h-48 overflow-y-auto border border-red-100 rounded-sm p-2 bg-red-50">
            {rowErrors.map((e, i) => (
              <li key={i}>
                Row {e.row} ({e.sku}): {e.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
