import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/categories', label: 'Categories' },
  { href: '/products/showcase', label: 'Product' }
];

const product = {
  name: 'Nimbus Softshell Jacket',
  subtitle: 'Technical outerwear engineered for city adventures',
  description:
    'Crafted with a waterproof, breathable membrane and recycled fleece lining, the Nimbus Softshell Jacket keeps you warm and dry without sacrificing mobility. Adjustable cuffs, a stowable hood, and reflective detailing ensure round-the-clock versatility.',
  price: '$248',
  rating: 4.8,
  reviews: 126,
  images: [
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1514996937319-344454492b37?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80'
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
  ]
};

const PublicProductPage = () => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState(product.colors[0]?.id ?? '');
  const [selectedSize, setSelectedSize] = useState(product.sizes[2]);

  const activeImage = useMemo(() => product.images[activeImageIndex] ?? product.images[0], [activeImageIndex]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 text-white">
      <header className="border-b border-white/10 bg-black/40">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
          <Link to="/" className="text-2xl font-semibold tracking-tight text-white">
            Aurora Market
          </Link>
          <nav className="flex flex-wrap items-center gap-4 text-sm text-slate-300">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`rounded-full px-4 py-2 transition hover:bg-white/10 ${
                  link.href === '/products/showcase' ? 'bg-white/10 text-white' : 'text-slate-300'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-slate-400">
            <span className="hidden sm:inline">Need help?</span>
            <a href="mailto:support@auroramarket.com" className="font-semibold text-white">
              support@auroramarket.com
            </a>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid gap-12 lg:grid-cols-[1.1fr,0.9fr]">
            <div className="space-y-4">
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5">
                <img src={activeImage} alt={product.name} className="h-full w-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4 text-xs text-white/80">
                  Swipe through looks styled by our community
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                {product.images.map((image, index) => (
                  <button
                    key={image}
                    type="button"
                    onClick={() => setActiveImageIndex(index)}
                    className={`overflow-hidden rounded-2xl border p-0.5 transition ${
                      activeImageIndex === index ? 'border-primary' : 'border-white/10 hover:border-white/30'
                    }`}
                    aria-label={`View product image ${index + 1}`}
                  >
                    <img src={image} alt="Product detail" className="h-24 w-full rounded-2xl object-cover" />
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-lg shadow-slate-900/40">
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-primary/80">New arrival</p>
              <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">{product.name}</h1>
              <p className="mt-2 text-sm text-slate-300">{product.subtitle}</p>
              <div className="mt-6 flex items-center gap-4 text-sm text-slate-200">
                <div className="flex items-center gap-1 text-primary">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <span key={index} aria-hidden>
                      {index < Math.round(product.rating) ? '★' : '☆'}
                    </span>
                  ))}
                </div>
                <span className="font-semibold text-white">{product.rating.toFixed(1)}</span>
                <span className="text-slate-400">({product.reviews} reviews)</span>
              </div>

              <div className="mt-8 rounded-2xl border border-white/10 bg-black/20 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Price</div>
                    <div className="mt-1 text-3xl font-semibold text-white">{product.price}</div>
                  </div>
                  <div className="text-right text-xs text-slate-400">
                    Free carbon-neutral shipping
                    <br />
                    Estimated delivery: 2-4 days
                  </div>
                </div>
              </div>

              <p className="mt-6 text-sm leading-relaxed text-slate-200">{product.description}</p>

              <div className="mt-8 space-y-6">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Color</div>
                  <div className="mt-3 flex flex-wrap gap-3">
                    {product.colors.map((color) => (
                      <button
                        key={color.id}
                        type="button"
                        onClick={() => setSelectedColor(color.id)}
                        className={`flex items-center gap-3 rounded-full border px-4 py-2 text-sm transition ${
                          selectedColor === color.id
                            ? 'border-primary bg-primary/20 text-white'
                            : 'border-white/10 bg-black/20 text-slate-200 hover:border-white/40'
                        }`}
                        aria-pressed={selectedColor === color.id}
                      >
                        <span
                          className="h-5 w-5 rounded-full border border-white/40"
                          style={{ backgroundColor: color.swatch }}
                        />
                        {color.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Size</div>
                  <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-6">
                    {product.sizes.map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setSelectedSize(size)}
                        className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                          selectedSize === size
                            ? 'border-primary bg-primary/20 text-white'
                            : 'border-white/10 bg-black/20 text-slate-200 hover:border-white/40'
                        }`}
                        aria-pressed={selectedSize === size}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <button
                  type="button"
                  className="flex-1 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/40 transition hover:-translate-y-0.5 hover:bg-blue-600"
                >
                  Add to bag
                </button>
                <button
                  type="button"
                  className="flex-1 rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:border-white hover:bg-white/10"
                >
                  Save to wishlist
                </button>
              </div>

              <ul className="mt-10 space-y-3 rounded-2xl border border-white/10 bg-black/10 p-6 text-sm text-slate-200">
                {product.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="border-t border-white/10 bg-black/30">
          <div className="mx-auto grid max-w-6xl gap-12 px-6 py-16 md:grid-cols-3">
            {["Performance", "Sustainability", "Care"].map((title, index) => (
              <article key={title} className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <h2 className="text-xl font-semibold text-white">{title}</h2>
                <p className="mt-3 text-sm text-slate-300">
                  {index === 0 &&
                    'The Nimbus is tested to keep you comfortable between 30°F and 55°F with excellent moisture control.'}
                  {index === 1 &&
                    'Made with 62% recycled fibers and low-impact dyes, each jacket diverts 28 plastic bottles from landfills.'}
                  {index === 2 &&
                    'Machine wash cold on gentle cycle, tumble dry low, and reactivate the DWR finish with a quick low-heat cycle.'}
                </p>
              </article>
            ))}
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

export default PublicProductPage;
