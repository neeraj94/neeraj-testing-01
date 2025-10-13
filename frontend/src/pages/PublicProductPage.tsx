import { MouseEvent, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

type InfoSection = {
  id: string;
  title: string;
  body: string;
  bullets?: string[];
};

type MerchCard = {
  id: string;
  name: string;
  image: string;
  price: number;
  badge?: string;
};

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/categories', label: 'Categories' },
  { href: '/brands', label: 'Brands' },
  { href: '/blog', label: 'Blog' },
  { href: '/products/showcase', label: 'Product' }
];

const product = {
  name: 'Nimbus Softshell Jacket',
  brand: 'Nimbus Atelier',
  subtitle: 'Technical outerwear engineered for city adventures',
  description:
    'Crafted with a waterproof, breathable membrane and recycled fleece lining, the Nimbus Softshell Jacket keeps you warm and dry without sacrificing mobility. Adjustable cuffs, a stowable hood, and reflective detailing ensure round-the-clock versatility.',
  pricing: {
    currency: 'USD',
    mrp: 318,
    price: 248,
    installments: 'or 4 interest-free payments with AuroraPay',
    discountLabel: 'Save 22% today'
  },
  rating: 4.8,
  reviews: 126,
  sku: 'NIMBUS-JKT-01',
  guarantee: '30-day fit guarantee & lifetime repair program',
  coupon: 'Extra 10% off (up to $25) with Aurora Rewards & partner bank cards',
  offers: [
    { label: 'Free delivery', description: 'Carbon-neutral delivery in 2-4 business days' },
    { label: 'Non-returnable', description: 'Hassle-free fit exchanges within 60 days' },
    { label: 'Top brand', description: 'Aurora trusted • premium partner since 2015' },
    { label: 'Secure transaction', description: 'Protected payments & order tracking' }
  ],
  images: [
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1514996937319-344454492b37?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80'
  ],
  colors: [
    { id: 'midnight', name: 'Midnight Blue', swatch: '#1e293b' },
    { id: 'stone', name: 'Stone Grey', swatch: '#475569' },
    { id: 'ember', name: 'Ember Rust', swatch: '#c2410c' }
  ],
  sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  highlights: [
    'EcoShield™ 3-layer waterproof membrane rated 20k/20k',
    'Recycled thermal fleece interior for lightweight warmth',
    '12 pockets including hidden media and travel sleeves',
    'Magnetic storm flap and two-way YKK® zipper',
    'Machine washable with durable water-repellent finish'
  ],
  about: [
    'Engineered for unpredictable forecasts with breathable storm-ready panels.',
    'Thoughtful storage: passport-safe interior pockets, magnetic cuff adjusters, and detachable hood.',
    'Sustainably produced with bluesign® approved textiles and 72% recycled fibers.',
    'Lifetime repairs included through Nimbus Atelier Care.'
  ],
  infoSections: [
    {
      id: 'item-details',
      title: 'Item details',
      body: 'Lightweight yet insulated layering with articulated sleeves and abrasion-resistant shoulders.',
      bullets: ['Standard fit sits just above the hip', 'Hidden storm cuffs lock out wind', 'Two-way zip with magnetic placket']
    },
    {
      id: 'measurements',
      title: 'Measurements',
      body: 'Model is 6’1” wearing size Medium. Garment length: 28.5in · Chest width: 43in · Sleeve: 35in.',
      bullets: ['True-to-size fit—size up for layering', 'Detailed size chart available at checkout']
    },
    {
      id: 'material-care',
      title: 'Material & care',
      body: 'Body: 68% recycled polyester, 22% elastane, 10% nylon · Lining: 100% recycled fleece.',
      bullets: ['Machine wash cold, gentle cycle', 'Tumble dry low to reactivate water repellency', 'Do not bleach or dry clean']
    },
    {
      id: 'style-notes',
      title: 'Style notes',
      body: 'Designed for multi-climate commuting—layer over merino sweaters or under insulated parkas.',
      bullets: ['Signature reflective back yoke', 'Detachable hood packs into interior pocket', 'Pairs with Nimbus Transit Backpack']
    }
  ] as InfoSection[],
  frequentlyBought: [
    {
      id: 'thermal-mug',
      name: 'Aurora Thermal Travel Mug',
      image: 'https://images.unsplash.com/photo-1542992015-4a0b729b1385?auto=format&fit=crop&w=800&q=80',
      price: 32,
      badge: 'Hot pick'
    },
    {
      id: 'trail-gloves',
      name: 'Trailway Merino Gloves',
      image: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=800&q=80',
      price: 48
    },
    {
      id: 'daypack',
      name: 'Nimbus Transit Daypack',
      image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80',
      price: 138
    }
  ] as MerchCard[],
  recentlyViewed: [
    {
      id: 'chelsea-boot',
      name: 'Atlas Weatherproof Chelsea Boot',
      image: 'https://images.unsplash.com/photo-1511556820780-d912e42b4980?auto=format&fit=crop&w=800&q=80',
      price: 210,
      badge: 'Back in stock'
    },
    {
      id: 'merino-scarf',
      name: 'Meridian Merino Scarf',
      image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80',
      price: 68
    },
    {
      id: 'down-parka',
      name: 'Horizon Down Parka',
      image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80',
      price: 348
    }
  ] as MerchCard[]
};

const PublicProductPage = () => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState(product.colors[0]?.id ?? '');
  const [selectedSize, setSelectedSize] = useState(product.sizes[2]);
  const [zoomOrigin, setZoomOrigin] = useState({ x: '50%', y: '50%' });
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() =>
    product.infoSections.reduce((acc, section, index) => {
      acc[section.id] = index === 0 || index === 2;
      return acc;
    }, {} as Record<string, boolean>)
  );

  const activeImage = useMemo(() => product.images[activeImageIndex] ?? product.images[0], [activeImageIndex]);
  const currencyFormatter = useMemo(
    () => new Intl.NumberFormat('en-US', { style: 'currency', currency: product.pricing.currency }),
    [product.pricing.currency]
  );
  const formattedPrice = currencyFormatter.format(product.pricing.price);
  const formattedMrp = currencyFormatter.format(product.pricing.mrp);
  const savingsValue = Math.max(product.pricing.mrp - product.pricing.price, 0);
  const formattedSavings = currencyFormatter.format(savingsValue);

  const handleImageMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const relativeX = ((event.clientX - bounds.left) / bounds.width) * 100;
    const relativeY = ((event.clientY - bounds.top) / bounds.height) * 100;
    setZoomOrigin({ x: `${relativeX}%`, y: `${relativeY}%` });
  };

  const toggleSection = (id: string) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const infoColumns = [
    product.infoSections.slice(0, 2),
    product.infoSections.slice(2)
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <Link to="/" className="text-2xl font-semibold tracking-tight text-slate-900">
            Aurora Market
          </Link>
          <nav className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`rounded-full px-4 py-2 transition ${
                  link.href === '/products/showcase'
                    ? 'bg-slate-900 text-white shadow-sm shadow-slate-900/20'
                    : 'hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-slate-500">
            <span className="hidden sm:inline">Need help?</span>
            <a href="mailto:support@auroramarket.com" className="font-semibold text-slate-900">
              support@auroramarket.com
            </a>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="grid gap-12 lg:grid-cols-[minmax(340px,420px)_minmax(0,1fr)]">
            <div className="space-y-6 lg:sticky lg:top-28">
              <div
                className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 shadow-sm transition-shadow hover:shadow-xl"
                onMouseMove={handleImageMouseMove}
                onMouseLeave={() => setZoomOrigin({ x: '50%', y: '50%' })}
              >
                <div className="aspect-[4/5] bg-slate-100">
                  <img
                    src={activeImage}
                    alt={product.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.18]"
                    style={{ transformOrigin: `${zoomOrigin.x} ${zoomOrigin.y}` }}
                  />
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/75 to-transparent p-4 text-xs text-white">
                  Hover to explore details · Scroll to keep the gallery in view
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
                {product.images.map((image, index) => (
                  <button
                    key={image}
                    type="button"
                    onClick={() => setActiveImageIndex(index)}
                    className={`group/thumbnail overflow-hidden rounded-2xl border transition ${
                      activeImageIndex === index
                        ? 'border-primary shadow-sm shadow-primary/40'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                    aria-label={`View product image ${index + 1}`}
                  >
                    <img
                      src={image}
                      alt="Product detail"
                      className="h-20 w-full object-cover transition-transform duration-300 group-hover/thumbnail:scale-110"
                    />
                  </button>
                ))}
              </div>
              <div className="hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:flex lg:flex-col">
                <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">Why you&apos;ll love it</h3>
                <ul className="mt-4 space-y-3 text-sm text-slate-600">
                  {product.highlights.map((highlight) => (
                    <li key={highlight} className="flex items-start gap-3">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
                      {highlight}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="space-y-10">
              <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs uppercase tracking-[0.35em] text-primary">
                  <span>{product.brand}</span>
                  <span>SKU {product.sku}</span>
                </div>
                <h1 className="mt-4 text-3xl font-semibold text-slate-900 sm:text-4xl">{product.name}</h1>
                <p className="mt-2 text-sm text-slate-600">{product.subtitle}</p>
                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-600">
                  <div className="flex items-center gap-1 text-amber-500">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <span key={index} aria-hidden>
                        {index < Math.round(product.rating) ? '★' : '☆'}
                      </span>
                    ))}
                  </div>
                  <span className="font-semibold text-slate-900">{product.rating.toFixed(1)}</span>
                  <span className="text-slate-500">{product.reviews} reviews</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-slate-600">
                    Aurora choice
                  </span>
                </div>

                <div className="mt-6 space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div className="flex flex-wrap items-baseline gap-3">
                      <span className="text-3xl font-semibold text-slate-900">{formattedPrice}</span>
                      <span className="text-sm text-slate-500 line-through">{formattedMrp}</span>
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-600">
                        {product.pricing.discountLabel}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-emerald-600">You save {formattedSavings}</div>
                  </div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{product.pricing.installments}</p>
                </div>

                <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                  <div className="font-semibold uppercase tracking-[0.3em] text-emerald-600">Available offers</div>
                  <p className="mt-2 leading-relaxed">{product.coupon}</p>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {product.offers.map((offer) => (
                    <div
                      key={offer.label}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700"
                    >
                      <div className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">{offer.label}</div>
                      <p className="mt-1 text-sm text-slate-600">{offer.description}</p>
                    </div>
                  ))}
                </div>

                <p className="mt-6 text-sm leading-relaxed text-slate-600">{product.description}</p>

                <div className="mt-8 space-y-6">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Color</div>
                    <div className="mt-3 flex flex-wrap gap-3">
                      {product.colors.map((color) => (
                        <button
                          key={color.id}
                          type="button"
                          onClick={() => setSelectedColor(color.id)}
                          className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition ${
                            selectedColor === color.id
                              ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                              : 'border-slate-200 hover:border-slate-400'
                          }`}
                        >
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: color.swatch }}
                            aria-hidden
                          />
                          {color.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Size</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {product.sizes.map((size) => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => setSelectedSize(size)}
                          className={`rounded-full border px-4 py-2 text-sm transition ${
                            selectedSize === size
                              ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                              : 'border-slate-200 hover:border-slate-400'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-8 grid gap-3 sm:grid-cols-[minmax(0,1fr),minmax(0,1fr)]">
                  <button
                    type="button"
                    className="rounded-full bg-slate-900 px-8 py-4 text-sm font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-slate-800"
                  >
                    Add to bag
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-slate-900 px-8 py-4 text-sm font-semibold uppercase tracking-[0.3em] text-slate-900 transition hover:bg-slate-900 hover:text-white"
                  >
                    Buy now
                  </button>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    <div className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Guarantee</div>
                    <p className="mt-1">{product.guarantee}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    <div className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Support</div>
                    <p className="mt-1">Talk to a Nimbus outfitter 24/7 at +1 (800) 555-0199</p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">About this item</h2>
                <ul className="mt-4 space-y-3 text-sm text-slate-600">
                  {product.about.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6 lg:px-8 lg:pb-16">
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Frequently bought together</h2>
              <p className="mt-2 text-sm text-slate-600">
                Complete the look with community favourites that pair seamlessly with the Nimbus Softshell Jacket.
              </p>
              <div className="mt-6 space-y-4">
                {product.frequentlyBought.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 rounded-2xl border border-slate-200 p-4 transition hover:border-primary/40 hover:shadow-lg"
                  >
                    <img src={item.image} alt={item.name} className="h-20 w-20 rounded-2xl object-cover" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-slate-900">{item.name}</h3>
                        {item.badge ? (
                          <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-primary">
                            {item.badge}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">{currencyFormatter.format(item.price)}</div>
                    </div>
                    <button
                      type="button"
                      className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <span className="font-semibold">Bundle &amp; save {currencyFormatter.format(24)} on the trio</span>
                <button
                  type="button"
                  className="rounded-full bg-slate-900 px-6 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-slate-800"
                >
                  Add all
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Recently viewed</h2>
              <p className="mt-2 text-sm text-slate-600">Pick up where you left off—curated from your last browsing session.</p>
              <div className="mt-6 space-y-4">
                {product.recentlyViewed.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 rounded-2xl border border-slate-200 p-4 transition hover:border-primary/40 hover:shadow-lg"
                  >
                    <img src={item.image} alt={item.name} className="h-20 w-20 rounded-2xl object-cover" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-slate-900">{item.name}</h3>
                        {item.badge ? (
                          <span className="rounded-full bg-slate-900/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-900">
                            {item.badge}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">{currencyFormatter.format(item.price)}</div>
                    </div>
                    <button
                      type="button"
                      className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                    >
                      View
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Product information</h2>
            <p className="mt-2 text-sm text-slate-600">
              Dive deeper into the construction and styling details to make sure the Nimbus Softshell fits your lifestyle.
            </p>
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              {infoColumns.map((column, columnIndex) => (
                <div key={columnIndex} className="space-y-4">
                  {column.map((section) => (
                    <div key={section.id} className="overflow-hidden rounded-2xl border border-slate-200">
                      <button
                        type="button"
                        onClick={() => toggleSection(section.id)}
                        className="flex w-full items-center justify-between gap-4 bg-slate-50 px-5 py-4 text-left text-sm font-semibold text-slate-900"
                      >
                        <span>{section.title}</span>
                        <span aria-hidden className="text-slate-400">
                          {openSections[section.id] ? '−' : '+'}
                        </span>
                      </button>
                      {openSections[section.id] ? (
                        <div className="space-y-3 px-5 pb-5 pt-1 text-sm text-slate-600">
                          <p>{section.body}</p>
                          {section.bullets ? (
                            <ul className="space-y-2">
                              {section.bullets.map((bullet) => (
                                <li key={bullet} className="flex gap-3">
                                  <span className="mt-1 h-1 w-1 rounded-full bg-primary" aria-hidden />
                                  <span>{bullet}</span>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
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

export default PublicProductPage;
