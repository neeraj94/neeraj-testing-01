const refundHighlights = [
  {
    title: '30-day premium guarantee',
    description:
      'Most items qualify for easy returns within 30 days of delivery when kept in original condition with packaging intact.'
  },
  {
    title: 'Instant store credit',
    description:
      'Choose Aurora Credit during your return request to receive funds immediately for your next purchase.'
  },
  {
    title: 'Doorstep pickups',
    description:
      'In select cities we&apos;ll arrange complimentary pickup for large or delicate items needing special care.'
  }
];

const refundSteps = [
  'Submit a return request from My Orders → Order Details.',
  'Select refund method (original payment or Aurora Credit).',
  'Package the item securely. We&apos;ll provide a prepaid label or schedule pickup.',
  'Receive confirmation once the item clears inspection — usually within 3 business days.'
];

const RefundPolicyPage = () => {
  return (
    <div className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-10">
        <header className="rounded-3xl bg-gradient-to-br from-white via-slate-50 to-rose-50 p-10 shadow-xl shadow-slate-900/10">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-primary">Refund Policy</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">Effortless returns &amp; exchanges</h1>
          <p className="mt-4 text-base text-slate-600">
            We design our policies to match the convenience of modern marketplaces while protecting artisan partners and conscious shoppers.
          </p>
        </header>
        <div className="space-y-8 rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
          <section className="grid gap-6 sm:grid-cols-3">
            {refundHighlights.map((item) => (
              <div key={item.title} className="rounded-2xl bg-slate-50 p-6 shadow-sm">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-primary">{item.title}</h2>
                <p className="mt-3 text-sm text-slate-600">{item.description}</p>
              </div>
            ))}
          </section>
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">How returns work</h2>
            <ol className="space-y-3 text-sm text-slate-600">
              {refundSteps.map((step, index) => (
                <li key={step} className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </section>
          <section className="space-y-3 rounded-2xl bg-slate-50 p-6">
            <h2 className="text-lg font-semibold text-slate-900">Exclusions</h2>
            <p className="text-sm text-slate-600">
              Final sale, hygiene-sensitive goods, and digital gift cards are not eligible for returns unless defective. Please review product pages for specific notes before checkout.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default RefundPolicyPage;
