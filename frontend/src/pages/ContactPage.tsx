const ContactPage = () => {
  return (
    <div className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-10">
        <div className="rounded-3xl bg-gradient-to-br from-white via-slate-50 to-blue-50 p-10 shadow-xl shadow-slate-900/10">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-primary">We&apos;re here to help</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">Contact Aurora Market</h1>
          <p className="mt-4 text-base text-slate-600">
            Reach out to our concierge team for personalized assistance with orders, returns, and product recommendations.
          </p>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Customer Care</h2>
              <p className="mt-3 text-lg font-semibold text-slate-900">support@auroramarket.com</p>
              <p className="mt-2 text-sm text-slate-600">Mon – Sat · 8:00am – 8:00pm</p>
              <a
                href="tel:+18001234567"
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary transition hover:text-primary/80"
              >
                <svg
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M5.5 3h-2v4.56A15.94 15.94 0 0 0 16.44 20.5H21v-2a2 2 0 0 0-2-2h-2.2a1.8 1.8 0 0 1-1.74-1.27l-.53-1.76a2 2 0 0 0-1.6-1.4l-2.58-.37a1.8 1.8 0 0 1-1.53-1.53L9.53 7.1a2 2 0 0 0-1.4-1.6L6.37 4.97A2 2 0 0 0 5.5 3Z" />
                </svg>
                +1 (800) 123-4567
              </a>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Showroom</h2>
              <p className="mt-3 text-lg font-semibold text-slate-900">Aurora Market HQ</p>
              <p className="mt-2 text-sm text-slate-600">245 Madison Avenue, Floor 12<br />New York, NY 10016</p>
              <p className="mt-4 text-sm text-slate-500">Walk-ins welcome · Booked consultations receive priority.</p>
            </div>
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
          <div className="space-y-5 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Service priorities</h2>
            <ul className="space-y-3 text-sm text-slate-600">
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">1</span>
                Concierge order tracking with SMS updates.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">2</span>
                Dedicated stylists for gifting, bundles, and seasonal curations.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">3</span>
                Hassle-free returns with doorstep pick-up in select cities.
              </li>
            </ul>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Message our team</h2>
            <p className="mt-2 text-sm text-slate-600">
              Share your request and our specialists will reply within one business day.
            </p>
            <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={(event) => event.preventDefault()}>
              <label className="sm:col-span-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Name</span>
                <input
                  type="text"
                  required
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </label>
              <label className="sm:col-span-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</span>
                <input
                  type="email"
                  required
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </label>
              <label className="sm:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">How can we help?</span>
                <textarea
                  required
                  rows={4}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </label>
              <button
                type="submit"
                className="sm:col-span-2 inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm shadow-primary/30 transition hover:bg-primary/90"
              >
                Send message
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
