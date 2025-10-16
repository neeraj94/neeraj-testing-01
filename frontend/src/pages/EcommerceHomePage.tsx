import { Link } from 'react-router-dom';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/categories', label: 'Categories' },
  { href: '/brands', label: 'Brands' },
  { href: '/blog', label: 'Blog' },
  { href: '/product/demo-product', label: 'Product' },
  { href: '/coupons', label: 'Coupons' },
  { href: '/cart', label: 'Cart' }
];

const features = [
  {
    title: 'Premium Products',
    description:
      'Discover curated collections of apparel, accessories, and lifestyle goods sourced from leading independent brands.'
  },
  {
    title: 'Sustainable Materials',
    description:
      'We partner with makers who prioritize recycled textiles, organic fibers, and responsible manufacturing.'
  },
  {
    title: 'Fast & Reliable Shipping',
    description:
      'Enjoy free delivery on orders over $75 with real-time tracking from our global fulfillment network.'
  }
];

const collections = [
  {
    name: 'Spring Essentials',
    description: 'Layered looks and vibrant palettes designed for breezy days and cool evenings.',
    cta: 'Shop Spring'
  },
  {
    name: 'Everyday Carry',
    description: 'Thoughtfully crafted bags, tech, and tools to keep pace with your routine.',
    cta: 'Upgrade Your Kit'
  },
  {
    name: 'Wellness Retreat',
    description: 'Spa-inspired self-care must haves to recharge mind, body, and space.',
    cta: 'Refresh Now'
  }
];

const EcommerceHomePage = () => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
          <Link to="/" className="text-2xl font-semibold tracking-tight text-slate-900">
            Aurora Market
          </Link>
          <nav className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`rounded-full px-4 py-2 transition ${
                  link.href === '/'
                    ? 'bg-slate-900 text-white shadow-sm shadow-slate-900/20'
                    : 'hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-slate-500">
            <span className="hidden sm:inline">Support</span>
            <a href="mailto:support@auroramarket.com" className="font-semibold text-slate-900">
              support@auroramarket.com
            </a>
          </div>
        </div>
      </header>

      <main>
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-slate-600">
                New Season Drop
              </span>
              <h1 className="mt-6 text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl">
                Elevate every day with products crafted to inspire your lifestyle.
              </h1>
              <p className="mt-4 text-lg text-slate-600">
                Shop curated collections featuring premium materials, mindful design, and planet-friendly manufacturing.
                Discover stories behind the brands and bring home pieces that last.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <a
                  href="#collections"
                  className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition hover:-translate-y-0.5 hover:bg-blue-600"
                >
                  Explore Collections
                </a>
                <a
                  href="#newsletter"
                  className="rounded-full border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
                >
                  Join the Community
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid gap-8 md:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <h2 className="text-xl font-semibold text-slate-900">{feature.title}</h2>
                <p className="mt-3 text-sm text-slate-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="collections" className="border-y border-slate-200 bg-slate-100">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
              <div>
                <h2 className="text-3xl font-semibold text-slate-900 sm:text-4xl">Shop by Collection</h2>
                <p className="mt-3 max-w-2xl text-sm text-slate-600">
                  Each edit is designed by our in-house stylists to pair effortlessly. Find your next signature look and
                  feel confident from desk to weekend.
                </p>
              </div>
              <a
                href="#newsletter"
                className="rounded-full border border-slate-300 px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
              >
                See lookbook
              </a>
            </div>
            <div className="mt-12 grid gap-8 md:grid-cols-3">
              {collections.map((collection) => (
                <article
                  key={collection.name}
                  className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="absolute inset-0 opacity-0 transition group-hover:opacity-100" aria-hidden>
                    <div className="absolute -top-10 right-0 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
                  </div>
                  <div className="relative">
                    <h3 className="text-2xl font-semibold text-slate-900">{collection.name}</h3>
                    <p className="mt-4 text-sm text-slate-600">{collection.description}</p>
                    <button
                      type="button"
                      className="mt-6 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white transition hover:bg-primary"
                    >
                      {collection.cta}
                      <span aria-hidden>→</span>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid gap-10 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
              <h2 className="text-3xl font-semibold text-slate-900">Weekly Spotlight</h2>
              <p className="mt-4 text-sm text-slate-600">
                Meet Lumina Atelier — a female-led studio crafting small-batch denim with water-saving dye techniques and
                inclusive sizing. Each piece is hand-finished in Los Angeles.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-slate-600">
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                  Vintage-wash denim jackets with removable shearling collars.
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                  Tailored jeans available in three inseam lengths and adaptive fits.
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                  A give-back program funding textile recycling initiatives across the West Coast.
                </li>
              </ul>
              <button
                type="button"
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-600"
              >
                View the collection
                <span aria-hidden>→</span>
              </button>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
              <h2 className="text-3xl font-semibold text-slate-900">Why shoppers love us</h2>
              <ul className="mt-6 space-y-4 text-sm text-slate-600">
                <li className="flex gap-3">
                  <span className="text-xl text-primary" aria-hidden>
                    ★
                  </span>
                  4.9 average rating across 12k verified reviews.
                </li>
                <li className="flex gap-3">
                  <span className="text-xl text-primary" aria-hidden>
                    🚚
                  </span>
                  Carbon-neutral shipping on every order.
                </li>
                <li className="flex gap-3">
                  <span className="text-xl text-primary" aria-hidden>
                    🔁
                  </span>
                  60-day hassle-free returns with reusable packaging.
                </li>
                <li className="flex gap-3">
                  <span className="text-xl text-primary" aria-hidden>
                    🤝
                  </span>
                  Exclusive collaborations released monthly.
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section id="newsletter" className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-5xl px-6 py-20 text-center">
            <h2 className="text-3xl font-semibold text-slate-900 sm:text-4xl">Get early access to product drops</h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm text-slate-600">
              Subscribe for insider stories, curated playlists, and invitations to limited-run collaborations with the
              designers you love.
            </p>
            <form className="mx-auto mt-8 flex max-w-xl flex-col gap-3 sm:flex-row">
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                placeholder="you@example.com"
                className="w-full rounded-full border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button
                type="submit"
                className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-600"
              >
                Notify me
              </button>
            </form>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <div>© {new Date().getFullYear()} Aurora Market. Crafted with purpose.</div>
          <div className="flex flex-wrap items-center gap-4">
            <a href="#" className="hover:text-slate-900">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-slate-900">
              Terms
            </a>
            <a href="#" className="hover:text-slate-900">
              Instagram
            </a>
            <a href="#" className="hover:text-slate-900">
              Pinterest
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default EcommerceHomePage;
