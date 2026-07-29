// A real, self-service application page now exists at /trade/apply — see
// TradeAccountApplicationsService's own comment for why this replaced the
// earlier /contact link (no application mechanism existed anywhere before
// that work).
export function TradeAccountCta() {
  return (
    <div className="bg-hydra text-white">
      <div className="max-w-[1240px] mx-auto px-8 py-14 flex justify-between items-center gap-8 flex-wrap">
        <div>
          <h2 className="font-display text-2xl font-bold mb-2 max-w-[480px]">
            Running a job site? Apply for trade pricing.
          </h2>
          <p className="text-[13.5px] text-white/80 max-w-[460px]">
            Approved trade accounts get discounted pricing, payment terms via trade credit, bulk ordering
            tools, and custom quotes.
          </p>
        </div>
        <a
          href="/trade/apply"
          className="font-mono text-[12px] uppercase tracking-wide bg-white text-hydra font-bold px-6 py-3 rounded-sm whitespace-nowrap"
        >
          Apply Now
        </a>
      </div>
    </div>
  );
}
