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
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 text-white">
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-40" aria-hidden>
          <div className="absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-primary blur-3xl" />
          <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-purple-600/60 blur-3xl" />
        </div>
        <div className="relative mx-auto flex max-w-6xl flex-col gap-10 px-6 py-24 sm:py-32">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-white/80">
              New Season Drop
            </span>
            <h1 className="mt-6 text-4xl font-semibold leading-tight text-white sm:text-6xl">
              Elevate every day with products crafted to inspire your lifestyle.
            </h1>
            <p className="mt-4 text-lg text-slate-200">
              Shop curated collections featuring premium materials, mindful design, and planet-friendly manufacturing.
              Discover stories behind the brands and bring home pieces that last.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a
                href="#collections"
                className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/40 transition hover:-translate-y-0.5 hover:bg-blue-600"
              >
                Explore Collections
              </a>
              <a
                href="#newsletter"
                className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:border-white hover:bg-white/10"
              >
                Join the Community
              </a>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid gap-8 md:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-lg shadow-slate-900/40 backdrop-blur"
              >
                <h2 className="text-xl font-semibold text-white">{feature.title}</h2>
                <p className="mt-3 text-sm text-slate-200">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="collections" className="bg-black/20">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
              <div>
                <h2 className="text-3xl font-semibold text-white sm:text-4xl">Shop by Collection</h2>
                <p className="mt-3 max-w-2xl text-sm text-slate-300">
                  Each edit is designed by our in-house stylists to pair effortlessly. Find your next signature look and
                  feel confident from desk to weekend.
                </p>
              </div>
              <a
                href="#newsletter"
                className="rounded-full border border-white/20 px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/70 transition hover:border-white hover:text-white"
              >
                See lookbook
              </a>
            </div>
            <div className="mt-12 grid gap-8 md:grid-cols-3">
              {collections.map((collection) => (
                <article
                  key={collection.name}
                  className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent p-8 backdrop-blur transition hover:-translate-y-1 hover:border-white/30"
                >
                  <div className="absolute inset-0 opacity-0 transition group-hover:opacity-100" aria-hidden>
                    <div className="absolute -top-10 right-0 h-40 w-40 rounded-full bg-primary/60 blur-3xl" />
                  </div>
                  <div className="relative">
                    <h3 className="text-2xl font-semibold text-white">{collection.name}</h3>
                    <p className="mt-4 text-sm text-slate-200">{collection.description}</p>
                    <button
                      type="button"
                      className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-widest text-slate-900 transition group-hover:bg-primary group-hover:text-white"
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
            <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-primary/30 via-primary/10 to-transparent p-10 text-white shadow-xl shadow-primary/20 backdrop-blur">
              <h2 className="text-3xl font-semibold">Weekly Spotlight</h2>
              <p className="mt-4 text-sm text-slate-100">
                Meet Lumina Atelier — a female-led studio crafting small-batch denim with water-saving dye techniques and
                inclusive sizing. Each piece is hand-finished in Los Angeles.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-slate-100/90">
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-white" />
                  Vintage-wash denim jackets with removable shearling collars.
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-white" />
                  Tailored jeans available in three inseam lengths and adaptive fits.
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-white" />
                  A give-back program funding textile recycling initiatives across the West Coast.
                </li>
              </ul>
              <button
                type="button"
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5 hover:bg-slate-100"
              >
                View the collection
                <span aria-hidden>→</span>
              </button>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-white shadow-lg shadow-slate-900/40 backdrop-blur">
              <h2 className="text-3xl font-semibold">Why shoppers love us</h2>
              <ul className="mt-6 space-y-4 text-sm text-slate-200">
                <li className="flex gap-3">
                  <span className="text-xl" aria-hidden>
                    ★
                  </span>
                  4.9 average rating across 12k verified reviews.
                </li>
                <li className="flex gap-3">
                  <span className="text-xl" aria-hidden>
                    🚚
                  </span>
                  Carbon-neutral shipping on every order.
                </li>
                <li className="flex gap-3">
                  <span className="text-xl" aria-hidden>
                    🔁
                  </span>
                  60-day hassle-free returns with reusable packaging.
                </li>
                <li className="flex gap-3">
                  <span className="text-xl" aria-hidden>
                    🤝
                  </span>
                  Exclusive collaborations released monthly.
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section id="newsletter" className="border-t border-white/10 bg-black/40">
          <div className="mx-auto max-w-5xl px-6 py-20 text-center">
            <h2 className="text-3xl font-semibold text-white sm:text-4xl">Get early access to product drops</h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm text-slate-300">
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
                className="w-full rounded-full border border-white/20 bg-black/40 px-4 py-3 text-sm text-white placeholder-white/50 focus:border-white focus:outline-none focus:ring-2 focus:ring-primary/60"
              />
              <button
                type="submit"
                className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/40 transition hover:bg-blue-600"
              >
                Notify me
              </button>
            </form>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-black/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <div>© {new Date().getFullYear()} Aurora Market. Crafted with purpose.</div>
          <div className="flex flex-wrap items-center gap-4">
            <a href="#" className="hover:text-white">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-white">
              Terms
            </a>
            <a href="#" className="hover:text-white">
              Instagram
            </a>
            <a href="#" className="hover:text-white">
              Pinterest
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default EcommerceHomePage;
