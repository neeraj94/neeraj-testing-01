import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/categories', label: 'Categories' },
  { href: '/blog', label: 'Blog' },
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
        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid gap-12 lg:grid-cols-[1.1fr,0.9fr]">
            <div className="space-y-4">
              <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <img src={activeImage} alt={product.name} className="h-full w-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/60 to-transparent p-4 text-xs text-white">
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
                      activeImageIndex === index
                        ? 'border-primary shadow-sm shadow-primary/30'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                    aria-label={`View product image ${index + 1}`}
                  >
                    <img src={image} alt="Product detail" className="h-24 w-full rounded-2xl object-cover" />
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-primary">New arrival</p>
              <h1 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">{product.name}</h1>
              <p className="mt-2 text-sm text-slate-600">{product.subtitle}</p>
              <div className="mt-6 flex items-center gap-4 text-sm text-slate-600">
                <div className="flex items-center gap-1 text-primary">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <span key={index} aria-hidden>
                      {index < Math.round(product.rating) ? '★' : '☆'}
                    </span>
                  ))}
                </div>
                <span className="font-semibold text-slate-900">{product.rating.toFixed(1)}</span>
                <span className="text-slate-500">({product.reviews} reviews)</span>
              </div>

              <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Price</div>
                    <div className="mt-1 text-3xl font-semibold text-slate-900">{product.price}</div>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    Free carbon-neutral shipping
                    <br />
                    Estimated delivery: 2-4 days
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

              <ul className="mt-10 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
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
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
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
