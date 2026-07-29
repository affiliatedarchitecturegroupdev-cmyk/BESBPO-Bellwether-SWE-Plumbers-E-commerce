import { auth } from '@/auth';
import { apiClient } from '@/lib/api-client';

interface CoCRecord {
  id: string;
  pirbRegNumber: string;
  certificateNumber: string;
  documentUrl: string;
  issuedAt: string;
}

const dateFormatter = new Intl.DateTimeFormat('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });

export default async function CompliancePage() {
  const session = await auth();
  if (!session?.accessToken) {
    return <p className="max-w-[600px] mx-auto px-8 py-16 text-sm text-steel">Please sign in.</p>;
  }

  const records = await apiClient.get<CoCRecord[]>('/v1/compliance/coc', { accessToken: session.accessToken });

  return (
    <div className="max-w-[600px] mx-auto px-8 py-10">
      <h1 className="font-display text-2xl font-bold mb-2">Certificates of Compliance</h1>
      <p className="text-sm text-steel mb-8">PIRB certificates issued for your completed installations.</p>

      {records.length === 0 ? (
        <p className="text-sm text-steel">No certificates on file yet.</p>
      ) : (
        <ul>
          {records.map((record) => (
            <li key={record.id} className="border-b border-black/5 py-3.5">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{record.certificateNumber}</span>
                <a
                  href={record.documentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-[11px] text-hydra"
                >
                  View PDF →
                </a>
              </div>
              <p className="text-[12px] text-steel mt-0.5">
                PIRB reg. {record.pirbRegNumber} · Issued {dateFormatter.format(new Date(record.issuedAt))}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
