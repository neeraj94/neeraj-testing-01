const termsSections = [
  {
    title: 'Using Aurora Market',
    body: [
      'Aurora Market is crafted for discerning shoppers seeking curated assortments. By browsing or purchasing, you agree to use our services for personal, non-commercial purposes in compliance with applicable laws.',
      'We reserve the right to adjust product availability, pricing, and promotions to preserve a premium, fair experience for all guests.'
    ]
  },
  {
    title: 'Orders & fulfillment',
    body: [
      'Orders are confirmed once payment authorization is received. You will receive live status notifications as your order moves from processing to delivery.',
      'In rare cases of inventory constraints, our concierge team will contact you with elevated alternatives or expedited refunds.'
    ]
  },
  {
    title: 'Account responsibilities',
    body: [
      'Keep your account details secure. You are responsible for safeguarding your credentials and notifying us immediately of any unauthorized activity.',
      'We may suspend or terminate accounts that misuse incentives, abuse return policies, or compromise platform security.'
    ]
  }
];

const TermsPage = () => {
  return (
    <div className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-10">
        <header className="rounded-3xl bg-gradient-to-br from-white via-slate-50 to-blue-50 p-10 shadow-xl shadow-slate-900/10">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-primary">Terms &amp; Conditions</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">Aurora Market Service Agreement</h1>
          <p className="mt-4 text-base text-slate-600">
            These terms ensure a trustworthy marketplace for our community. Please review them carefully before completing your order.
          </p>
        </header>
        <div className="space-y-8 rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
          {termsSections.map((section) => (
            <section key={section.title} className="space-y-3">
              <h2 className="text-xl font-semibold text-slate-900">{section.title}</h2>
              {section.body.map((paragraph, index) => (
                <p key={index} className="text-sm leading-relaxed text-slate-600">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
          <section className="space-y-3 rounded-2xl bg-slate-50 p-6">
            <h2 className="text-lg font-semibold text-slate-900">Need more clarity?</h2>
            <p className="text-sm text-slate-600">
              Email <a className="font-semibold text-primary" href="mailto:legal@auroramarket.com">legal@auroramarket.com</a> and our compliance specialists will assist within one business day.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;
