import { MouseEvent, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

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
  price: '$248',
  rating: 4.8,
  reviews: 126,
  sku: 'NIMBUS-JKT-01',
  guarantee: '30-day fit guarantee & lifetime repair program',
  highlights: [
    'Waterproof, windproof, and breathable for four-season wear',
    'Crafted with 72% recycled fibers and traceable insulation',
    'Includes modular hood, packable pouch, and travel-ready pockets'
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
  features: [
    'EcoShield™ 3-layer waterproof membrane rated 20k/20k',
    'Recycled thermal fleece interior for lightweight warmth',
    '12 pockets including hidden media and travel sleeves',
    'Magnetic storm flap and two-way YKK® zipper',
    'Machine washable with durable water-repellent finish'
  ],
  care: [
    'Machine wash cold with similar colors',
    'Use gentle detergent, no fabric softener',
    'Tumble dry low to reactivate water repellency'
  ],
  delivery: {
    shipping: 'Free carbon-neutral shipping within 2-4 business days',
    pickup: 'Same-day pickup available in select cities',
    returns: 'Free returns and exchanges within 60 days'
  }
};

const PublicProductPage = () => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState(product.colors[0]?.id ?? '');
  const [selectedSize, setSelectedSize] = useState(product.sizes[2]);
  const [zoomOrigin, setZoomOrigin] = useState({ x: '50%', y: '50%' });

  const activeImage = useMemo(() => product.images[activeImageIndex] ?? product.images[0], [activeImageIndex]);

  const handleImageMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const relativeX = ((event.clientX - bounds.left) / bounds.width) * 100;
    const relativeY = ((event.clientY - bounds.top) / bounds.height) * 100;
    setZoomOrigin({ x: `${relativeX}%`, y: `${relativeY}%` });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
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
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-10 lg:py-16">
          <div className="grid gap-10 xl:grid-cols-[minmax(320px,420px)_minmax(360px,1fr)_minmax(260px,320px)]">
            <div className="space-y-4">
              <div
                className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-lg"
                onMouseMove={handleImageMouseMove}
                onMouseLeave={() => setZoomOrigin({ x: '50%', y: '50%' })}
              >
                <div className="aspect-[4/5]">
                  <img
                    src={activeImage}
                    alt={product.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-125"
                    style={{ transformOrigin: `${zoomOrigin.x} ${zoomOrigin.y}` }}
                  />
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/70 to-transparent p-4 text-xs text-white">
                  Hover to zoom · Drag thumbnails to preview alternate looks
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-4">
                {product.images.map((image, index) => (
                  <button
                    key={image}
                    type="button"
                    onClick={() => setActiveImageIndex(index)}
                    className={`group/thumbnail overflow-hidden rounded-2xl border transition ${
                      activeImageIndex === index
                        ? 'border-primary shadow-sm shadow-primary/30'
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

            <div className="space-y-8">
              <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.35em] text-primary">
                  <span>{product.brand}</span>
                  <span>SKU {product.sku}</span>
                </div>
                <h1 className="mt-4 text-3xl font-semibold text-slate-900 sm:text-4xl">{product.name}</h1>
                <p className="mt-2 text-sm text-slate-600">{product.subtitle}</p>
                <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-slate-600">
                  <div className="flex items-center gap-1 text-amber-500">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <span key={index} aria-hidden>
                        {index < Math.round(product.rating) ? '★' : '☆'}
                      </span>
                    ))}
                  </div>
                  <span className="font-semibold text-slate-900">{product.rating.toFixed(1)}</span>
                  <span className="text-slate-500">({product.reviews} reviews)</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-slate-600">
                    Bestseller
                  </span>
                </div>

                <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Price</div>
                      <div className="mt-1 text-3xl font-semibold text-slate-900">{product.price}</div>
                    </div>
                    <div className="text-xs text-slate-500">
                      <p>{product.delivery.shipping}</p>
                      <p>{product.delivery.pickup}</p>
                    </div>
                  </div>
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
                          className={`flex items-center gap-3 rounded-full border px-4 py-2 text-sm transition ${
                            selectedColor === color.id
                              ? 'border-primary bg-primary/10 text-slate-900 shadow-sm shadow-primary/20'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                          }`}
                          aria-pressed={selectedColor === color.id}
                        >
                          <span
                            className="h-5 w-5 rounded-full border border-white/70"
                            style={{ backgroundColor: color.swatch }}
                          />
                          {color.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Size</div>
                    <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-6">
                      {product.sizes.map((size) => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => setSelectedSize(size)}
                          className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                            selectedSize === size
                              ? 'border-primary bg-primary/10 text-slate-900 shadow-sm shadow-primary/20'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                          }`}
                          aria-pressed={selectedSize === size}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-slate-500">True to size · model is 6&apos;1&quot; wearing size M</p>
                  </div>
                </div>

                <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                  <button
                    type="button"
                    className="flex-1 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-600"
                  >
                    Add to bag
                  </button>
                  <button
                    type="button"
                    className="flex-1 rounded-full border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
                  >
                    Save to wishlist
                  </button>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Care &amp; features</h2>
                <ul className="mt-4 space-y-3 text-sm text-slate-600">
                  {product.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
                      {feature}
                    </li>
                  ))}
                </ul>
                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-6">
                  <h3 className="text-sm font-semibold text-slate-900">Care instructions</h3>
                  <ul className="mt-3 space-y-2 text-sm text-slate-600">
                    {product.care.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-400" aria-hidden />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Delivery &amp; support</h2>
                <div className="mt-4 space-y-4 text-sm text-slate-600">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <h3 className="text-sm font-semibold text-slate-900">Shipping</h3>
                    <p className="mt-2 text-sm text-slate-600">{product.delivery.shipping}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <h3 className="text-sm font-semibold text-slate-900">Store pickup</h3>
                    <p className="mt-2 text-sm text-slate-600">{product.delivery.pickup}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <h3 className="text-sm font-semibold text-slate-900">Returns</h3>
                    <p className="mt-2 text-sm text-slate-600">{product.delivery.returns}</p>
                  </div>
                </div>
              </div>
            </div>

            <aside className="space-y-6">
              <div className="sticky top-24 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">Secure checkout</h2>
                <p className="mt-3 text-sm text-slate-600">
                  {product.guarantee}
                </p>
                <div className="mt-6 space-y-3 text-sm text-slate-600">
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <span className="text-xl" aria-hidden>
                      🚚
                    </span>
                    <div>
                      <p className="font-semibold text-slate-900">Fast worldwide shipping</p>
                      <p className="text-xs text-slate-500">Carbon neutral deliveries in recyclable packaging</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <span className="text-xl" aria-hidden>
                      🛡️
                    </span>
                    <div>
                      <p className="font-semibold text-slate-900">Extended protection plan</p>
                      <p className="text-xs text-slate-500">Add 3-year accidental coverage at checkout</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <span className="text-xl" aria-hidden>
                      ♻️
                    </span>
                    <div>
                      <p className="font-semibold text-slate-900">Trade-in ready</p>
                      <p className="text-xs text-slate-500">Earn credit when you recycle previous season styles</p>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="mt-6 w-full rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
                >
                  Chat with a stylist
                </button>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">Complete the look</h3>
                <p className="mt-3 text-sm text-slate-600">
                  Pair with our Atlas travel backpack and Orbit thermal bottle for weatherproof commuting.
                </p>
                <div className="mt-4 flex items-center gap-4">
                  <div className="h-20 w-20 overflow-hidden rounded-2xl border border-slate-200">
                    <img
                      src="https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?auto=format&fit=crop&w=400&q=80"
                      alt="Atlas backpack"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="text-sm text-slate-600">
                    <p className="font-semibold text-slate-900">Atlas Travel Backpack</p>
                    <p className="text-xs text-slate-500">In stock · ships today</p>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-10 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <div>© {new Date().getFullYear()} Aurora Market. Crafted with purpose.</div>
          <div className="flex flex-wrap items-center gap-4">
            <a href="#" className="hover:text-slate-900">
              Shipping
            </a>
            <a href="#" className="hover:text-slate-900">
              Returns
            </a>
            <a href="#" className="hover:text-slate-900">
              Contact
            </a>
            <a href="#" className="hover:text-slate-900">
              Sustainability
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicProductPage;
