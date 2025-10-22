import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';

const quickLinks = [
  { label: 'Home', href: '/' },
  { label: 'Products', href: '/products' },
  { label: 'Categories', href: '/categories' },
  { label: 'Coupons', href: '/coupons' },
  { label: 'My Orders', href: '/account/orders', requiresAuth: true },
  { label: 'My Account', href: '/account', requiresAuth: true },
  { label: 'Contact', href: '/contact' }
];

const policyLinks = [
  { label: 'Terms & Conditions', href: '/terms' },
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Refund Policy', href: '/refunds' }
];

const socialLinks = [
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/',
    icon: (
      <svg
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="currentColor"
      >
        <path d="M7 3C4.243 3 2 5.243 2 8v8c0 2.757 2.243 5 5 5h10c2.757 0 5-2.243 5-5V8c0-2.757-2.243-5-5-5H7Zm0 2h10c1.654 0 3 1.346 3 3v8c0 1.654-1.346 3-3 3H7c-1.654 0-3-1.346-3-3V8c0-1.654 1.346-3 3-3Zm10 1.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3ZM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z" />
      </svg>
    )
  },
  {
    label: 'Facebook',
    href: 'https://www.facebook.com/',
    icon: (
      <svg
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="currentColor"
      >
        <path d="M13 3a5 5 0 0 0-5 5v3H6v3h2v7h3v-7h3l1-3h-4V8a2 2 0 0 1 2-2h2V3h-2Z" />
      </svg>
    )
  },
  {
    label: 'Twitter',
    href: 'https://twitter.com/',
    icon: (
      <svg
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="currentColor"
      >
        <path d="M20.947 6.305c.01.15.01.3.01.451 0 4.6-3.5 9.907-9.907 9.907a9.85 9.85 0 0 1-5.353-1.566 7.01 7.01 0 0 0 5.162-1.447 3.485 3.485 0 0 1-3.255-2.417c.214.033.428.053.652.053.314 0 .628-.043.92-.12a3.48 3.48 0 0 1-2.793-3.417v-.043c.467.26 1.002.416 1.57.437a3.475 3.475 0 0 1-1.552-2.894c0-.646.172-1.244.477-1.764a9.893 9.893 0 0 0 7.183 3.644 3.928 3.928 0 0 1-.087-.798 3.48 3.48 0 0 1 3.48-3.48c1.002 0 1.908.422 2.543 1.098a6.836 6.836 0 0 0 2.21-.844 3.47 3.47 0 0 1-1.53 1.916 6.965 6.965 0 0 0 2-.537 7.564 7.564 0 0 1-1.742 1.8Z" />
      </svg>
    )
  }
];

const StorefrontFooter = () => {
  const [submittedEmail, setSubmittedEmail] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'submitted'>('idle');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') ?? '').trim();
    if (!email) {
      return;
    }
    setSubmittedEmail(email);
    setStatus('submitted');
    event.currentTarget.reset();
  };

  return (
    <footer className="border-t border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div className="space-y-4">
          <Link to="/" className="text-2xl font-semibold text-slate-900">
            Aurora Market
          </Link>
          <p className="text-sm text-slate-500">
            Curating the finest essentials, gadgets, and lifestyle products with a premium, customer-first experience.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">Quick Links</h3>
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            {quickLinks.map((link) => (
              <li key={link.label}>
                <Link className="transition hover:text-primary" to={link.href}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">Policies</h3>
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            {policyLinks.map((link) => (
              <li key={link.label}>
                <Link className="transition hover:text-primary" to={link.href}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">Stay in Touch</h3>
          <p className="mt-4 text-sm text-slate-500">
            Subscribe for curated drops, limited-time deals, and insider guides inspired by world-class marketplaces.
          </p>
          <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={handleSubmit}>
            <label className="sr-only" htmlFor="newsletter-email">
              Email address
            </label>
            <input
              id="newsletter-email"
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-primary/30 transition hover:bg-primary/90"
            >
              Subscribe
            </button>
          </form>
          {status === 'submitted' ? (
            <p className="mt-2 text-xs text-green-600">
              Thanks! We&apos;ll keep {submittedEmail} updated with the latest from Aurora Market.
            </p>
          ) : null}
          <div className="mt-5 flex items-center gap-3">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noreferrer"
                aria-label={social.label}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-primary/40 hover:text-primary"
              >
                {social.icon}
              </a>
            ))}
          </div>
        </div>
      </div>
      <div className="border-t border-slate-200 bg-slate-50/90">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-slate-500 sm:flex-row sm:px-6 lg:px-8">
          <span>&copy; {new Date().getFullYear()} Aurora Market. All rights reserved.</span>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {policyLinks.map((link) => (
              <Link key={link.label} className="transition hover:text-primary" to={link.href}>
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default StorefrontFooter;
