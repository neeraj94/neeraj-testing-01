const privacySections = [
  {
    title: 'Data we collect',
    body: [
      'We collect profile information, browsing behaviour, and purchase history to personalize recommendations and fulfill orders.',
      'Payment details are securely processed by certified partners; Aurora Market does not store full card information.'
    ]
  },
  {
    title: 'How we use your information',
    body: [
      'Insights power tailored promotions, curated collections, and faster customer support experiences.',
      'You can update communication preferences or request data deletion at any time from the My Account dashboard.'
    ]
  },
  {
    title: 'Protecting your privacy',
    body: [
      'We employ industry-leading encryption, regular security reviews, and role-based access to safeguard your data.',
      'If we ever detect suspicious activity, our security team will notify you immediately and take protective action.'
    ]
  }
];

const PrivacyPage = () => {
  return (
    <div className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-10">
        <header className="rounded-3xl bg-gradient-to-br from-white via-slate-50 to-emerald-50 p-10 shadow-xl shadow-slate-900/10">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-primary">Privacy Policy</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">Your data, your confidence</h1>
          <p className="mt-4 text-base text-slate-600">
            Transparency is at the heart of the Aurora Market experience. Discover how we protect your information across every touchpoint.
          </p>
        </header>
        <div className="space-y-8 rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
          {privacySections.map((section) => (
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
            <h2 className="text-lg font-semibold text-slate-900">Control your preferences</h2>
            <p className="text-sm text-slate-600">
              Visit <span className="font-semibold text-primary">My Account → Privacy</span> to download your data, adjust analytics sharing, or request account deletion.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;
