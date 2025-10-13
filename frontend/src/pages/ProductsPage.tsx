import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import PageHeader from '../components/PageHeader';
import PageSection from '../components/PageSection';
import MediaLibraryDialog from '../components/MediaLibraryDialog';
import { useToast } from '../components/ToastProvider';
import { useAppSelector } from '../app/hooks';
import { hasAnyPermission } from '../utils/permissions';
import type { PermissionKey } from '../types/auth';
import api from '../services/http';
import type { BrandPage } from '../types/brand';
import type { Category, CategoryPage } from '../types/category';
import type { TaxRatePage } from '../types/tax-rate';
import type { Attribute, AttributePage, AttributeValue } from '../types/attribute';
import type { MediaSelection } from '../types/uploaded-file';
import type {
  CreateProductPayload,
  DiscountType,
  StockVisibilityState
} from '../types/product';
import { extractErrorMessage } from '../utils/errors';

interface ProductFormState {
  name: string;
  brandId: string;
  unit: string;
  weightKg: string;
  minPurchaseQuantity: string;
  featured: 'yes' | 'no';
  todaysDeal: 'yes' | 'no';
  description: string;
  videoProvider: string;
  videoUrl: string;
  unitPrice: string;
  discountValue: string;
  discountType: DiscountType;
  discountMinQuantity: string;
  discountMaxQuantity: string;
  priceTag: string;
  stockQuantity: string;
  sku: string;
  externalLink: string;
  externalLinkButton: string;
  lowStockWarning: string;
  stockVisibility: StockVisibilityState;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  metaCanonicalUrl: string;
}

interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[];
}

interface AttributeSelection {
  attributeId: number;
  attributeName: string;
  values: AttributeValue[];
  selectedValueIds: number[];
}

interface VariantCombinationValue {
  attributeId: number;
  attributeName: string;
  valueId: number;
  valueName: string;
}

interface ProductVariantFormState {
  combination: VariantCombinationValue[];
  priceAdjustment: string;
  sku: string;
  quantity: string;
  media: MediaSelection[];
}

type MediaDialogContext =
  | { type: 'gallery' }
  | { type: 'thumbnail' }
  | { type: 'pdf' }
  | { type: 'metaImage' }
  | { type: 'variant'; key: string };

const defaultFormState: ProductFormState = {
  name: '',
  brandId: '',
  unit: '',
  weightKg: '',
  minPurchaseQuantity: '',
  featured: 'no',
  todaysDeal: 'no',
  description: '',
  videoProvider: 'YOUTUBE',
  videoUrl: '',
  unitPrice: '',
  discountValue: '',
  discountType: 'FLAT',
  discountMinQuantity: '',
  discountMaxQuantity: '',
  priceTag: '',
  stockQuantity: '',
  sku: '',
  externalLink: '',
  externalLinkButton: '',
  lowStockWarning: '',
  stockVisibility: 'SHOW_QUANTITY',
  metaTitle: '',
  metaDescription: '',
  metaKeywords: '',
  metaCanonicalUrl: ''
};

const videoProviderOptions = [
  { value: 'YOUTUBE', label: 'YouTube' },
  { value: 'VIMEO', label: 'Vimeo' },
  { value: 'DAILYMOTION', label: 'DailyMotion' },
  { value: 'CUSTOM', label: 'Custom embed' }
];

const stockVisibilityOptions: { value: StockVisibilityState; label: string; description: string }[] = [
  {
    value: 'SHOW_QUANTITY',
    label: 'Show stock quantity',
    description: 'Display the exact available quantity to shoppers.'
  },
  {
    value: 'SHOW_TEXT',
    label: 'Show stock with text only',
    description: 'Reveal stock status without exact counts (e.g. "In stock").'
  },
  {
    value: 'HIDE',
    label: 'Hide stock',
    description: 'Keep stock information private on the storefront.'
  }
];

const tabs = [
  { id: 'general', label: 'General information' },
  { id: 'media', label: 'Media & attachments' },
  { id: 'pricing', label: 'Price & stock' },
  { id: 'seo', label: 'SEO meta' },
  { id: 'shipping', label: 'Shipping configuration' },
  { id: 'warranty', label: 'Warranty' },
  { id: 'frequentlyBought', label: 'Frequently bought' }
] as const;

type TabId = (typeof tabs)[number]['id'];

const buildCategoryTree = (categories: Category[]): CategoryTreeNode[] => {
  const nodes = new Map<number, CategoryTreeNode>();
  const roots: CategoryTreeNode[] = [];

  categories.forEach((category) => {
    nodes.set(category.id, { ...category, children: [] });
  });

  nodes.forEach((node) => {
    if (node.parentId && nodes.has(node.parentId)) {
      nodes.get(node.parentId)?.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortNodes = (list: CategoryTreeNode[]) =>
    list
      .map((node) => ({
        ...node,
        children: sortNodes(node.children)
      }))
      .sort((a, b) => {
        const aOrder = typeof a.orderNumber === 'number' ? a.orderNumber : Number.MAX_SAFE_INTEGER;
        const bOrder = typeof b.orderNumber === 'number' ? b.orderNumber : Number.MAX_SAFE_INTEGER;
        if (aOrder !== bOrder) {
          return aOrder - bOrder;
        }
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      });

  return sortNodes(roots);
};

const parseNumber = (value: string): number | null => {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatVariantLabel = (combination: VariantCombinationValue[]) =>
  combination.map((part) => `${part.attributeName}: ${part.valueName}`).join(' · ');
const ProductsPage = () => {
  const { notify } = useToast();
  const permissions = useAppSelector((state) => state.auth.permissions);

  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [form, setForm] = useState<ProductFormState>(defaultFormState);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [selectedTaxIds, setSelectedTaxIds] = useState<number[]>([]);
  const [gallery, setGallery] = useState<MediaSelection[]>([]);
  const [thumbnail, setThumbnail] = useState<MediaSelection | null>(null);
  const [pdfSpecification, setPdfSpecification] = useState<MediaSelection | null>(null);
  const [metaImage, setMetaImage] = useState<MediaSelection | null>(null);
  const [mediaContext, setMediaContext] = useState<MediaDialogContext | null>(null);
  const [selectedAttributes, setSelectedAttributes] = useState<AttributeSelection[]>([]);
  const [variants, setVariants] = useState<Record<string, ProductVariantFormState>>({});
  const [brandDropdownOpen, setBrandDropdownOpen] = useState(false);

  const brandDropdownRef = useRef<HTMLDivElement | null>(null);

  const canCreate = useMemo(
    () => hasAnyPermission(permissions as PermissionKey[], ['PRODUCT_CREATE']),
    [permissions]
  );

  const brandsQuery = useQuery({
    queryKey: ['products', 'brands'],
    queryFn: async () => {
      const { data } = await api.get<BrandPage>('/brands', {
        params: { page: 0, size: 200 }
      });
      return data.content ?? [];
    }
  });

  const categoriesQuery = useQuery({
    queryKey: ['products', 'categories'],
    queryFn: async () => {
      const { data } = await api.get<CategoryPage>('/categories', {
        params: { page: 0, size: 500 }
      });
      return data.content ?? [];
    }
  });

  const taxRatesQuery = useQuery({
    queryKey: ['products', 'tax-rates'],
    queryFn: async () => {
      const { data } = await api.get<TaxRatePage>('/tax-rates', {
        params: { page: 0, size: 200 }
      });
      return data.content ?? [];
    }
  });

  const attributesQuery = useQuery({
    queryKey: ['products', 'attributes'],
    queryFn: async () => {
      const { data } = await api.get<AttributePage>('/attributes', {
        params: { page: 0, size: 200 }
      });
      return data.content ?? [];
    }
  });

  const categoryTree = useMemo(
    () => buildCategoryTree(categoriesQuery.data ?? []),
    [categoriesQuery.data]
  );

  const activeAttributes = useMemo(
    () => selectedAttributes.filter((attribute) => attribute.selectedValueIds.length > 0),
    [selectedAttributes]
  );

  const variantCombinations = useMemo(() => {
    if (!activeAttributes.length) {
      return [] as VariantCombinationValue[][];
    }

    let combinations: VariantCombinationValue[][] = [[]];

    for (const attribute of activeAttributes) {
      const attributeValues = attribute.selectedValueIds
        .map((valueId) => {
          const value = attribute.values.find((entry) => entry.id === valueId);
          if (!value) {
            return null;
          }
          return {
            attributeId: attribute.attributeId,
            attributeName: attribute.attributeName,
            valueId: value.id,
            valueName: value.value
          } satisfies VariantCombinationValue;
        })
        .filter((entry): entry is VariantCombinationValue => entry !== null);

      if (!attributeValues.length) {
        return [];
      }

      const next: VariantCombinationValue[][] = [];
      for (const combination of combinations) {
        for (const value of attributeValues) {
          next.push([...combination, value]);
        }
      }
      combinations = next;
    }

    return combinations;
  }, [activeAttributes]);

  useEffect(() => {
    setVariants((previous) => {
      const next: Record<string, ProductVariantFormState> = {};
      variantCombinations.forEach((combination) => {
        const key = combination.map((part) => part.valueId).join('-');
        next[key] = previous[key]
          ? { ...previous[key], combination }
          : {
              combination,
              priceAdjustment: '',
              sku: '',
              quantity: '',
              media: []
            };
      });
      return next;
    });
  }, [variantCombinations]);

  useEffect(() => {
    const handleClickAway = (event: MouseEvent) => {
      if (!brandDropdownRef.current) {
        return;
      }
      if (!brandDropdownRef.current.contains(event.target as Node)) {
        setBrandDropdownOpen(false);
      }
    };

    if (brandDropdownOpen) {
      document.addEventListener('mousedown', handleClickAway);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickAway);
    };
  }, [brandDropdownOpen]);
  const createMutation = useMutation({
    mutationFn: async (payload: CreateProductPayload) => {
      await api.post('/products', payload);
    },
    onSuccess: () => {
      notify({ type: 'success', message: 'Product created successfully.' });
      resetFormState();
    },
    onError: (error: unknown) => {
      notify({
        type: 'error',
        message: extractErrorMessage(error, 'Unable to create product. Please try again later.')
      });
    }
  });

  const selectedBrand = useMemo(() => {
    const brands = brandsQuery.data ?? [];
    return brands.find((brand) => String(brand.id) === form.brandId) ?? null;
  }, [brandsQuery.data, form.brandId]);

  const toggleCategorySelection = (categoryId: number) => {
    setSelectedCategoryIds((previous) =>
      previous.includes(categoryId)
        ? previous.filter((id) => id !== categoryId)
        : [...previous, categoryId]
    );
  };

  const toggleTaxSelection = (taxId: number) => {
    setSelectedTaxIds((previous) =>
      previous.includes(taxId)
        ? previous.filter((id) => id !== taxId)
        : [...previous, taxId]
    );
  };

  const toggleAttribute = (attribute: Attribute, enabled: boolean) => {
    setSelectedAttributes((previous) => {
      if (enabled) {
        if (previous.some((entry) => entry.attributeId === attribute.id)) {
          return previous;
        }
        return [
          ...previous,
          {
            attributeId: attribute.id,
            attributeName: attribute.name,
            values: attribute.values,
            selectedValueIds: []
          }
        ];
      }
      return previous.filter((entry) => entry.attributeId !== attribute.id);
    });
  };

  const toggleAttributeValue = (attributeId: number, valueId: number) => {
    setSelectedAttributes((previous) =>
      previous.map((entry) => {
        if (entry.attributeId !== attributeId) {
          return entry;
        }
        const selectedValueIds = entry.selectedValueIds.includes(valueId)
          ? entry.selectedValueIds.filter((id) => id !== valueId)
          : [...entry.selectedValueIds, valueId];
        return { ...entry, selectedValueIds };
      })
    );
  };

  const removeGalleryItem = (index: number) => {
    setGallery((previous) => previous.filter((_, itemIndex) => itemIndex !== index));
  };

  const removeVariantMedia = (variantKey: string, mediaIndex: number) => {
    setVariants((previous) => {
      const variant = previous[variantKey];
      if (!variant) {
        return previous;
      }
      const nextMedia = variant.media.filter((_, index) => index !== mediaIndex);
      return {
        ...previous,
        [variantKey]: { ...variant, media: nextMedia }
      };
    });
  };

  const handleVariantFieldChange = (
    variantKey: string,
    field: 'priceAdjustment' | 'sku' | 'quantity',
    value: string
  ) => {
    setVariants((previous) => {
      const variant = previous[variantKey];
      if (!variant) {
        return previous;
      }
      return {
        ...previous,
        [variantKey]: { ...variant, [field]: value }
      };
    });
  };
  const resetFormState = () => {
    setForm(defaultFormState);
    setSelectedCategoryIds([]);
    setSelectedTaxIds([]);
    setGallery([]);
    setThumbnail(null);
    setPdfSpecification(null);
    setMetaImage(null);
    setSelectedAttributes([]);
    setVariants({});
    setActiveTab('general');
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canCreate || createMutation.isPending) {
      return;
    }

    const payload: CreateProductPayload = {
      name: form.name.trim(),
      brandId: form.brandId ? Number(form.brandId) : null,
      unit: form.unit.trim(),
      weightKg: parseNumber(form.weightKg),
      minPurchaseQuantity: parseNumber(form.minPurchaseQuantity),
      taxRateIds: selectedTaxIds,
      categoryIds: selectedCategoryIds,
      featured: form.featured === 'yes',
      todaysDeal: form.todaysDeal === 'yes',
      description: form.description,
      gallery,
      thumbnail,
      videoProvider: form.videoProvider,
      videoUrl: form.videoUrl.trim(),
      pdfSpecification,
      seo: {
        title: form.metaTitle.trim(),
        description: form.metaDescription.trim(),
        image: metaImage,
        keywords: form.metaKeywords.trim(),
        canonicalUrl: form.metaCanonicalUrl.trim()
      },
      pricing: {
        unitPrice: parseNumber(form.unitPrice),
        discountType: form.discountType,
        discountValue: parseNumber(form.discountValue),
        discountMinQuantity: parseNumber(form.discountMinQuantity),
        discountMaxQuantity: parseNumber(form.discountMaxQuantity),
        priceTag: form.priceTag.trim(),
        stockQuantity: parseNumber(form.stockQuantity),
        sku: form.sku.trim(),
        externalLink: form.externalLink.trim(),
        externalLinkButton: form.externalLinkButton.trim(),
        lowStockWarning: parseNumber(form.lowStockWarning),
        stockVisibility: form.stockVisibility
      },
      attributes: selectedAttributes
        .filter((attribute) => attribute.selectedValueIds.length > 0)
        .map((attribute) => ({
          attributeId: attribute.attributeId,
          valueIds: attribute.selectedValueIds
        })),
      variants: variantCombinations.map((combination) => {
        const key = combination.map((part) => part.valueId).join('-');
        const variant = variants[key];
        return {
          key,
          attributeValueIds: combination.map((part) => part.valueId),
          priceAdjustment: variant ? parseNumber(variant.priceAdjustment) : null,
          sku: variant?.sku.trim() ?? '',
          quantity: variant ? parseNumber(variant.quantity) : null,
          media: variant?.media ?? []
        };
      })
    };

    createMutation.mutate(payload);
  };

  const renderCategoryNodes = (nodes: CategoryTreeNode[], depth = 0): JSX.Element[] => {
    return nodes.flatMap((node) => {
      const indentation = depth * 16;
      const checkbox = (
        <label key={`category-${node.id}`} className="flex items-center gap-3 py-1">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
            checked={selectedCategoryIds.includes(node.id)}
            onChange={() => toggleCategorySelection(node.id)}
          />
          <span className="text-sm text-slate-700" style={{ paddingLeft: `${indentation}px` }}>
            {node.name}
          </span>
        </label>
      );

      if (!node.children.length) {
        return [checkbox];
      }

      return [
        checkbox,
        <div key={`category-children-${node.id}`} className="ml-4 border-l border-dashed border-slate-200 pl-4">
          {renderCategoryNodes(node.children, depth + 1)}
        </div>
      ];
    });
  };

  const openMediaDialog = (context: MediaDialogContext) => {
    setMediaContext(context);
  };

  const closeMediaDialog = () => {
    setMediaContext(null);
  };

  const handleMediaSelect = (selection: MediaSelection) => {
    if (!mediaContext) {
      return;
    }

    switch (mediaContext.type) {
      case 'gallery':
        setGallery((previous) => [...previous, selection]);
        break;
      case 'thumbnail':
        setThumbnail(selection);
        break;
      case 'pdf':
        setPdfSpecification(selection);
        break;
      case 'metaImage':
        setMetaImage(selection);
        break;
      case 'variant':
        setVariants((previous) => {
          const variant = previous[mediaContext.key];
          if (!variant) {
            return previous;
          }
          return {
            ...previous,
            [mediaContext.key]: {
              ...variant,
              media: [...variant.media, selection]
            }
          };
        });
        break;
      default:
        break;
    }

    setMediaContext(null);
  };

  const isLoading =
    brandsQuery.isLoading || categoriesQuery.isLoading || taxRatesQuery.isLoading || attributesQuery.isLoading;
  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description="Create and configure catalog products, manage media, and prepare rich merchandising data before publishing."
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <nav className="flex flex-wrap gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-full px-4 py-2 text-sm transition focus:outline-none focus:ring-2 focus:ring-primary/30 ${
                  activeTab === tab.id
                    ? 'bg-primary text-white shadow-sm shadow-primary/30'
                    : 'bg-white text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="space-y-6 px-4 py-6 sm:px-6">
            {activeTab === 'general' && (
              <PageSection
                title="Essential details"
                description="Capture the baseline product information, brand association, merchandising units, and merchandising badges."
              >
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="product-name" className="text-sm font-medium text-slate-700">
                        Product name
                      </label>
                      <input
                        id="product-name"
                        type="text"
                        value={form.name}
                        onChange={(event) => setForm((previous) => ({ ...previous, name: event.target.value }))}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        placeholder="Aurora Running Shoe"
                        required
                      />
                    </div>

                    <div ref={brandDropdownRef} className="relative">
                      <span className="text-sm font-medium text-slate-700">Brand</span>
                      <button
                        type="button"
                        onClick={() => setBrandDropdownOpen((open) => !open)}
                        className="mt-1 flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        {selectedBrand ? (
                          <span className="flex items-center gap-3">
                            {selectedBrand.logoUrl ? (
                              <img src={selectedBrand.logoUrl} alt="" className="h-6 w-6 rounded-full object-cover" />
                            ) : (
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600">
                                {selectedBrand.name.charAt(0).toUpperCase()}
                              </span>
                            )}
                            <span>{selectedBrand.name}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">Select a brand</span>
                        )}
                        <span className="text-slate-400">▾</span>
                      </button>
                      {brandDropdownOpen && (
                        <div className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                          {(brandsQuery.data ?? []).map((brand) => (
                            <button
                              key={brand.id}
                              type="button"
                              onClick={() => {
                                setForm((previous) => ({ ...previous, brandId: String(brand.id) }));
                                setBrandDropdownOpen(false);
                              }}
                              className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition hover:bg-slate-50 ${
                                form.brandId === String(brand.id) ? 'bg-primary/5 text-primary' : 'text-slate-700'
                              }`}
                            >
                              {brand.logoUrl ? (
                                <img src={brand.logoUrl} alt="" className="h-6 w-6 rounded-full object-cover" />
                              ) : (
                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600">
                                  {brand.name.charAt(0).toUpperCase()}
                                </span>
                              )}
                              <span>{brand.name}</span>
                            </button>
                          ))}
                          {!brandsQuery.data?.length && (
                            <div className="px-4 py-3 text-sm text-slate-500">No brands available yet.</div>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <label htmlFor="product-unit" className="text-sm font-medium text-slate-700">
                        Unit
                      </label>
                      <input
                        id="product-unit"
                        type="text"
                        value={form.unit}
                        onChange={(event) => setForm((previous) => ({ ...previous, unit: event.target.value }))}
                        placeholder="Piece, kg, pack…"
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="product-weight" className="text-sm font-medium text-slate-700">
                          Weight (kg)
                        </label>
                        <input
                          id="product-weight"
                          type="number"
                          min="0"
                          step="0.01"
                          value={form.weightKg}
                          onChange={(event) => setForm((previous) => ({ ...previous, weightKg: event.target.value }))}
                          placeholder="0.75"
                          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div>
                        <label htmlFor="product-min-qty" className="text-sm font-medium text-slate-700">
                          Minimum purchase quantity
                        </label>
                        <input
                          id="product-min-qty"
                          type="number"
                          min="1"
                          step="1"
                          value={form.minPurchaseQuantity}
                          onChange={(event) =>
                            setForm((previous) => ({ ...previous, minPurchaseQuantity: event.target.value }))
                          }
                          placeholder="1"
                          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                    </div>

                    <fieldset className="space-y-3 rounded-xl border border-slate-200 px-4 py-4">
                      <legend className="text-sm font-semibold text-slate-700">Badging</legend>
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <div>
                          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Featured</span>
                          <div className="mt-2 flex items-center gap-4 text-sm text-slate-600">
                            <label className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="featured"
                                value="yes"
                                checked={form.featured === 'yes'}
                                onChange={(event) =>
                                  setForm((previous) => ({ ...previous, featured: event.target.value as 'yes' | 'no' }))
                                }
                                className="h-4 w-4 border-slate-300 text-primary focus:ring-primary"
                              />
                              Yes
                            </label>
                            <label className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="featured"
                                value="no"
                                checked={form.featured === 'no'}
                                onChange={(event) =>
                                  setForm((previous) => ({ ...previous, featured: event.target.value as 'yes' | 'no' }))
                                }
                                className="h-4 w-4 border-slate-300 text-primary focus:ring-primary"
                              />
                              No
                            </label>
                          </div>
                        </div>
                        <div>
                          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Today&apos;s deal</span>
                          <div className="mt-2 flex items-center gap-4 text-sm text-slate-600">
                            <label className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="todaysDeal"
                                value="yes"
                                checked={form.todaysDeal === 'yes'}
                                onChange={(event) =>
                                  setForm((previous) => ({ ...previous, todaysDeal: event.target.value as 'yes' | 'no' }))
                                }
                                className="h-4 w-4 border-slate-300 text-primary focus:ring-primary"
                              />
                              Yes
                            </label>
                            <label className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="todaysDeal"
                                value="no"
                                checked={form.todaysDeal === 'no'}
                                onChange={(event) =>
                                  setForm((previous) => ({ ...previous, todaysDeal: event.target.value as 'yes' | 'no' }))
                                }
                                className="h-4 w-4 border-slate-300 text-primary focus:ring-primary"
                              />
                              No
                            </label>
                          </div>
                        </div>
                      </div>
                    </fieldset>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <span className="text-sm font-medium text-slate-700">Categories</span>
                      <p className="mt-1 text-xs text-slate-500">
                        Select where the product appears in the catalog hierarchy. Parent/child relationships are displayed for
                        quick scanning.
                      </p>
                      <div className="mt-3 max-h-64 space-y-2 overflow-y-auto rounded-xl border border-slate-200 p-4">
                        {categoriesQuery.isLoading ? (
                          <p className="text-sm text-slate-500">Loading categories…</p>
                        ) : !categoryTree.length ? (
                          <p className="text-sm text-slate-500">No categories available yet.</p>
                        ) : (
                          renderCategoryNodes(categoryTree)
                        )}
                      </div>
                      {selectedCategoryIds.length > 0 && (
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          Selected:
                          {selectedCategoryIds.map((categoryId) => {
                            const category = (categoriesQuery.data ?? []).find((entry) => entry.id === categoryId);
                            return (
                              <span
                                key={categoryId}
                                className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary"
                              >
                                {category?.name ?? `Category #${categoryId}`}
                                <button
                                  type="button"
                                  onClick={() => toggleCategorySelection(categoryId)}
                                  className="text-primary/70 transition hover:text-primary"
                                >
                                  ×
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div>
                      <span className="text-sm font-medium text-slate-700">Applicable taxes</span>
                      <p className="mt-1 text-xs text-slate-500">Attach one or multiple tax profiles.</p>
                      <div className="mt-3 space-y-2 rounded-xl border border-slate-200 p-4">
                        {taxRatesQuery.isLoading ? (
                          <p className="text-sm text-slate-500">Loading taxes…</p>
                        ) : !(taxRatesQuery.data ?? []).length ? (
                          <p className="text-sm text-slate-500">No tax rates configured yet.</p>
                        ) : (
                          (taxRatesQuery.data ?? []).map((tax) => (
                            <label key={tax.id} className="flex items-center justify-between gap-3 text-sm text-slate-700">
                              <span>
                                <span className="font-medium">{tax.name}</span>
                                <span className="ml-2 text-xs text-slate-500">
                                  {tax.rateType === 'PERCENTAGE' ? `${tax.rateValue}%` : `Flat ${tax.rateValue}`}
                                </span>
                              </span>
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                                checked={selectedTaxIds.includes(tax.id)}
                                onChange={() => toggleTaxSelection(tax.id)}
                              />
                            </label>
                          ))
                        )}
                      </div>
                    </div>

                    <div>
                      <label htmlFor="product-description" className="text-sm font-medium text-slate-700">
                        Description
                      </label>
                      <textarea
                        id="product-description"
                        value={form.description}
                        onChange={(event) => setForm((previous) => ({ ...previous, description: event.target.value }))}
                        rows={6}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        placeholder="Highlight the product story, materials, fit, and care instructions."
                      />
                    </div>
                  </div>
                </div>
              </PageSection>
            )}
            {activeTab === 'media' && (
              <PageSection
                title="Media & attachments"
                description="Manage gallery imagery, hero thumbnails, product videos, and supporting specification documents."
              >
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700">Gallery images</span>
                        <button
                          type="button"
                          onClick={() => openMediaDialog({ type: 'gallery' })}
                          className="text-sm font-medium text-primary transition hover:text-primary/80"
                        >
                          Add images
                        </button>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Showcase multiple angles or lifestyle imagery. You can attach as many visuals as needed.
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {gallery.map((item, index) => (
                          <div key={`${item.url}-${index}`} className="group relative overflow-hidden rounded-xl border border-slate-200">
                            <img src={item.url} alt="" className="h-32 w-full object-cover" />
                            <button
                              type="button"
                              onClick={() => removeGalleryItem(index)}
                              className="absolute right-2 top-2 hidden rounded-full bg-rose-600/90 px-2 py-1 text-xs font-medium text-white shadow-sm transition group-hover:inline"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                        {!gallery.length && (
                          <div className="col-span-full rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                            No gallery images yet. Click “Add images” to upload or pick from the media library.
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-sm font-medium text-slate-700">Video</span>
                      <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label htmlFor="video-provider" className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                            Provider
                          </label>
                          <select
                            id="video-provider"
                            value={form.videoProvider}
                            onChange={(event) => setForm((previous) => ({ ...previous, videoProvider: event.target.value }))}
                            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                          >
                            {videoProviderOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label htmlFor="video-url" className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                            Video link
                          </label>
                          <input
                            id="video-url"
                            type="url"
                            value={form.videoUrl}
                            onChange={(event) => setForm((previous) => ({ ...previous, videoUrl: event.target.value }))}
                            placeholder="https://youtu.be/…"
                            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700">Thumbnail image</span>
                        <button
                          type="button"
                          onClick={() => openMediaDialog({ type: 'thumbnail' })}
                          className="text-sm font-medium text-primary transition hover:text-primary/80"
                        >
                          {thumbnail ? 'Replace' : 'Select thumbnail'}
                        </button>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Primary image shown in cards and featured placements.
                      </p>
                      <div className="mt-3 h-40 overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50">
                        {thumbnail ? (
                          <img src={thumbnail.url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-sm text-slate-500">
                            No thumbnail selected yet.
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700">PDF specification</span>
                        <button
                          type="button"
                          onClick={() => openMediaDialog({ type: 'pdf' })}
                          className="text-sm font-medium text-primary transition hover:text-primary/80"
                        >
                          {pdfSpecification ? 'Replace document' : 'Attach PDF'}
                        </button>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Share sizing charts, care guides, or product specification sheets.
                      </p>
                      {pdfSpecification ? (
                        <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                          <span>{pdfSpecification.originalFilename ?? 'Specification.pdf'}</span>
                          <button
                            type="button"
                            onClick={() => setPdfSpecification(null)}
                            className="text-primary transition hover:text-primary/70"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div className="mt-3 rounded-xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
                          No document attached yet.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </PageSection>
            )}
            {activeTab === 'pricing' && (
              <PageSection
                title="Price & stock"
                description="Configure pricing, inventory, and attribute-driven variants. Base pricing powers quick calculations for every variant."
              >
                <div className="space-y-6">
                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-800">Attribute options</h3>
                        <p className="mt-1 text-xs text-slate-500">
                          Enable the attributes that should generate product variants. Select values for each attribute.
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      {(attributesQuery.data ?? []).map((attribute) => {
                        const selection = selectedAttributes.find((entry) => entry.attributeId === attribute.id);
                        const enabled = Boolean(selection);
                        return (
                          <div key={attribute.id} className="rounded-xl border border-slate-200 p-4 shadow-sm">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="text-sm font-semibold text-slate-800">{attribute.name}</h4>
                                <p className="mt-1 text-xs text-slate-500">
                                  {attribute.values.length} value{attribute.values.length === 1 ? '' : 's'} available
                                </p>
                              </div>
                              <label className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                                  checked={enabled}
                                  onChange={(event) => toggleAttribute(attribute, event.target.checked)}
                                />
                                Use
                              </label>
                            </div>
                            {enabled && selection && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {attribute.values.map((value) => {
                                  const isSelected = selection.selectedValueIds.includes(value.id);
                                  return (
                                    <button
                                      key={value.id}
                                      type="button"
                                      onClick={() => toggleAttributeValue(attribute.id, value.id)}
                                      className={`rounded-full px-3 py-1 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                                        isSelected
                                          ? 'bg-primary text-white shadow-sm shadow-primary/30'
                                          : 'bg-slate-100 text-slate-600 hover:bg-primary/10 hover:text-primary'
                                      }`}
                                    >
                                      {value.value}
                                    </button>
                                  );
                                })}
                                {!attribute.values.length && (
                                  <span className="text-xs text-slate-500">No values defined yet.</span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {!(attributesQuery.data ?? []).length && (
                        <div className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
                          No attributes available yet. Configure attributes to unlock variant pricing.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-2">
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="unit-price" className="text-sm font-medium text-slate-700">
                          Unit price
                        </label>
                        <input
                          id="unit-price"
                          type="number"
                          min="0"
                          step="0.01"
                          value={form.unitPrice}
                          onChange={(event) => setForm((previous) => ({ ...previous, unitPrice: event.target.value }))}
                          placeholder="100.00"
                          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label htmlFor="discount-value" className="text-sm font-medium text-slate-700">
                            Discount value
                          </label>
                          <input
                            id="discount-value"
                            type="number"
                            step="0.01"
                            value={form.discountValue}
                            onChange={(event) => setForm((previous) => ({ ...previous, discountValue: event.target.value }))}
                            placeholder="10"
                            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                        <div>
                          <span className="text-sm font-medium text-slate-700">Discount type</span>
                          <div className="mt-1 flex items-center gap-4 text-sm text-slate-600">
                            {(['FLAT', 'PERCENTAGE'] as DiscountType[]).map((type) => (
                              <label key={type} className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name="discountType"
                                  value={type}
                                  checked={form.discountType === type}
                                  onChange={(event) =>
                                    setForm((previous) => ({
                                      ...previous,
                                      discountType: event.target.value as DiscountType
                                    }))
                                  }
                                  className="h-4 w-4 border-slate-300 text-primary focus:ring-primary"
                                />
                                {type === 'FLAT' ? 'Flat amount' : 'Percentage'}
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label htmlFor="discount-min" className="text-sm font-medium text-slate-700">
                            Discount min quantity
                          </label>
                          <input
                            id="discount-min"
                            type="number"
                            min="0"
                            step="1"
                            value={form.discountMinQuantity}
                            onChange={(event) =>
                              setForm((previous) => ({ ...previous, discountMinQuantity: event.target.value }))
                            }
                            placeholder="1"
                            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                        <div>
                          <label htmlFor="discount-max" className="text-sm font-medium text-slate-700">
                            Discount max quantity
                          </label>
                          <input
                            id="discount-max"
                            type="number"
                            min="0"
                            step="1"
                            value={form.discountMaxQuantity}
                            onChange={(event) =>
                              setForm((previous) => ({ ...previous, discountMaxQuantity: event.target.value }))
                            }
                            placeholder="10"
                            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="price-tag" className="text-sm font-medium text-slate-700">
                          Price tag label
                        </label>
                        <input
                          id="price-tag"
                          type="text"
                          value={form.priceTag}
                          onChange={(event) => setForm((previous) => ({ ...previous, priceTag: event.target.value }))}
                          placeholder="MSRP / Launch price"
                          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label htmlFor="stock-quantity" className="text-sm font-medium text-slate-700">
                          Stock quantity
                        </label>
                        <input
                          id="stock-quantity"
                          type="number"
                          min="0"
                          step="1"
                          value={form.stockQuantity}
                          onChange={(event) => setForm((previous) => ({ ...previous, stockQuantity: event.target.value }))}
                          placeholder="250"
                          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label htmlFor="sku" className="text-sm font-medium text-slate-700">
                            SKU
                          </label>
                          <input
                            id="sku"
                            type="text"
                            value={form.sku}
                            onChange={(event) => setForm((previous) => ({ ...previous, sku: event.target.value }))}
                            placeholder="AUR-SHOE-001"
                            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                        <div>
                          <label htmlFor="external-link" className="text-sm font-medium text-slate-700">
                            External link
                          </label>
                          <input
                            id="external-link"
                            type="url"
                            value={form.externalLink}
                            onChange={(event) => setForm((previous) => ({ ...previous, externalLink: event.target.value }))}
                            placeholder="https://brand.com/product"
                            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label htmlFor="external-button" className="text-sm font-medium text-slate-700">
                            External link button label
                          </label>
                          <input
                            id="external-button"
                            type="text"
                            value={form.externalLinkButton}
                            onChange={(event) =>
                              setForm((previous) => ({ ...previous, externalLinkButton: event.target.value }))
                            }
                            placeholder="Shop now"
                            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                        <div>
                          <label htmlFor="low-stock" className="text-sm font-medium text-slate-700">
                            Low stock warning threshold
                          </label>
                          <input
                            id="low-stock"
                            type="number"
                            min="0"
                            step="1"
                            value={form.lowStockWarning}
                            onChange={(event) => setForm((previous) => ({ ...previous, lowStockWarning: event.target.value }))}
                            placeholder="20"
                            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                      </div>

                      <div className="space-y-3 rounded-xl border border-slate-200 px-4 py-4">
                        <span className="text-sm font-semibold text-slate-800">Stock visibility</span>
                        {stockVisibilityOptions.map((option) => (
                          <label key={option.value} className="flex items-start gap-3 text-sm text-slate-700">
                            <input
                              type="radio"
                              name="stockVisibility"
                              value={option.value}
                              checked={form.stockVisibility === option.value}
                              onChange={(event) =>
                                setForm((previous) => ({
                                  ...previous,
                                  stockVisibility: event.target.value as StockVisibilityState
                                }))
                              }
                              className="mt-1 h-4 w-4 border-slate-300 text-primary focus:ring-primary"
                            />
                            <span>
                              <span className="font-medium">{option.label}</span>
                              <span className="block text-xs text-slate-500">{option.description}</span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {variantCombinations.length > 0 ? (
                    <div className="overflow-hidden rounded-xl border border-slate-200">
                      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                        <h3 className="text-sm font-semibold text-slate-800">Generated variants</h3>
                        <p className="mt-1 text-xs text-slate-500">
                          Each combination inherits the base price. Set price adjustments, dedicated SKUs, quantities, and
                          attach tailored imagery per variant.
                        </p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                          <thead className="bg-slate-50 text-xs uppercase tracking-[0.2em] text-slate-500">
                            <tr>
                              <th className="px-4 py-3 font-semibold">Variant</th>
                              <th className="px-4 py-3 font-semibold">Price adjustment</th>
                              <th className="px-4 py-3 font-semibold">Final price</th>
                              <th className="px-4 py-3 font-semibold">SKU</th>
                              <th className="px-4 py-3 font-semibold">Quantity</th>
                              <th className="px-4 py-3 font-semibold">Photos</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {variantCombinations.map((combination) => {
                              const key = combination.map((part) => part.valueId).join('-');
                              const variant = variants[key];
                              const basePrice = parseNumber(form.unitPrice) ?? 0;
                              const priceAdjustment = parseNumber(variant?.priceAdjustment ?? '') ?? 0;
                              const finalPrice = basePrice + priceAdjustment;
                              return (
                                <tr key={key}>
                                  <td className="px-4 py-3 align-top text-slate-700">
                                    <div className="font-semibold text-slate-900">{formatVariantLabel(combination)}</div>
                                  </td>
                                  <td className="px-4 py-3 align-top">
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={variant?.priceAdjustment ?? ''}
                                      onChange={(event) => handleVariantFieldChange(key, 'priceAdjustment', event.target.value)}
                                      placeholder="10"
                                      className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                  </td>
                                  <td className="px-4 py-3 align-top text-slate-700">
                                    <div className="font-semibold text-slate-900">{finalPrice.toFixed(2)}</div>
                                    <div className="text-xs text-slate-500">Base {basePrice.toFixed(2)}</div>
                                  </td>
                                  <td className="px-4 py-3 align-top">
                                    <input
                                      type="text"
                                      value={variant?.sku ?? ''}
                                      onChange={(event) => handleVariantFieldChange(key, 'sku', event.target.value)}
                                      placeholder="AUR-SHOE-001-6"
                                      className="w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                  </td>
                                  <td className="px-4 py-3 align-top">
                                    <input
                                      type="number"
                                      min="0"
                                      step="1"
                                      value={variant?.quantity ?? ''}
                                      onChange={(event) => handleVariantFieldChange(key, 'quantity', event.target.value)}
                                      placeholder="50"
                                      className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                  </td>
                                  <td className="px-4 py-3 align-top">
                                    <div className="flex flex-col gap-2">
                                      <button
                                        type="button"
                                        onClick={() => openMediaDialog({ type: 'variant', key })}
                                        className="inline-flex items-center justify-center rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-primary/90"
                                      >
                                        {variant?.media.length ? 'Add more photos' : 'Attach photos'}
                                      </button>
                                      <div className="flex flex-wrap gap-2">
                                        {variant?.media.map((mediaItem, index) => (
                                          <div key={`${mediaItem.url}-${index}`} className="relative h-12 w-12 overflow-hidden rounded-lg">
                                            <img src={mediaItem.url} alt="" className="h-full w-full object-cover" />
                                            <button
                                              type="button"
                                              onClick={() => removeVariantMedia(key, index)}
                                              className="absolute -right-2 -top-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-sm"
                                            >
                                              ×
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-300 px-6 py-8 text-center text-sm text-slate-500">
                      Variants will appear here once you enable attributes and choose values. Without attributes the base pricing
                      above will be used for the product.
                    </div>
                  )}
                </div>
              </PageSection>
            )}
            {activeTab === 'seo' && (
              <PageSection
                title="SEO meta data"
                description="Craft search-friendly titles, descriptions, and imagery to support marketing campaigns."
              >
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="meta-title" className="text-sm font-medium text-slate-700">
                        Meta title
                      </label>
                      <input
                        id="meta-title"
                        type="text"
                        value={form.metaTitle}
                        onChange={(event) => setForm((previous) => ({ ...previous, metaTitle: event.target.value }))}
                        placeholder="Aurora Running Shoe – Lightweight comfort"
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div>
                      <label htmlFor="meta-description" className="text-sm font-medium text-slate-700">
                        Meta description
                      </label>
                      <textarea
                        id="meta-description"
                        rows={4}
                        value={form.metaDescription}
                        onChange={(event) => setForm((previous) => ({ ...previous, metaDescription: event.target.value }))}
                        placeholder="Experience all-day cushioning with the Aurora Running Shoe, designed with responsive foam and breathable mesh."
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div>
                      <label htmlFor="meta-keywords" className="text-sm font-medium text-slate-700">
                        Meta keywords
                      </label>
                      <input
                        id="meta-keywords"
                        type="text"
                        value={form.metaKeywords}
                        onChange={(event) => setForm((previous) => ({ ...previous, metaKeywords: event.target.value }))}
                        placeholder="running shoes, lightweight sneakers, breathable trainers"
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div>
                      <label htmlFor="meta-canonical" className="text-sm font-medium text-slate-700">
                        Canonical URL
                      </label>
                      <input
                        id="meta-canonical"
                        type="url"
                        value={form.metaCanonicalUrl}
                        onChange={(event) => setForm((previous) => ({ ...previous, metaCanonicalUrl: event.target.value }))}
                        placeholder="https://aurora.market/products/aurora-running-shoe"
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700">Meta image</span>
                        <button
                          type="button"
                          onClick={() => openMediaDialog({ type: 'metaImage' })}
                          className="text-sm font-medium text-primary transition hover:text-primary/80"
                        >
                          {metaImage ? 'Replace image' : 'Select image'}
                        </button>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Recommended 1200×630px for rich previews across social platforms.
                      </p>
                      <div className="mt-3 h-48 overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50">
                        {metaImage ? (
                          <img src={metaImage.url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-sm text-slate-500">
                            No meta image selected yet.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </PageSection>
            )}

            {activeTab === 'shipping' && (
              <PageSection
                title="Shipping"
                description="Configure shipping rules, dimensional weight, and fulfillment promises for this product."
              >
                <div className="rounded-xl border border-dashed border-slate-300 px-6 py-10 text-center text-sm text-slate-500">
                  Shipping configuration will live here. Use this space to define carriers, lead times, and packaging soon.
                </div>
              </PageSection>
            )}

            {activeTab === 'warranty' && (
              <PageSection
                title="Warranty"
                description="Document warranty coverage to build buyer confidence."
              >
                <div className="rounded-xl border border-dashed border-slate-300 px-6 py-10 text-center text-sm text-slate-500">
                  Warranty content builder coming soon. Add warranty tiers, coverage notes, and registration requirements here.
                </div>
              </PageSection>
            )}

            {activeTab === 'frequentlyBought' && (
              <PageSection
                title="Frequently bought together"
                description="Cross-sell complementary products to raise average order value."
              >
                <div className="rounded-xl border border-dashed border-slate-300 px-6 py-10 text-center text-sm text-slate-500">
                  Build bundled recommendations here later. Link accessories, add-ons, or service plans to this product.
                </div>
              </PageSection>
            )}
          </div>
        </div>
        <div className="flex flex-col items-stretch gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="space-y-1 text-sm text-slate-500">
            {isLoading && <div>We are loading catalog data to help with product configuration…</div>}
            {!canCreate && (
              <div className="text-rose-500">
                You do not have permission to create products. Contact an administrator to request access.
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={resetFormState}
              className="inline-flex items-center justify-center rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
            >
              Reset form
            </button>
            <button
              type="submit"
              disabled={!canCreate || createMutation.isPending}
              className={`inline-flex items-center justify-center rounded-full px-6 py-2 text-sm font-semibold text-white shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary/30 ${
                !canCreate || createMutation.isPending
                  ? 'bg-slate-400'
                  : 'bg-primary hover:bg-primary/90'
              }`}
            >
              {createMutation.isPending ? 'Saving…' : 'Save product'}
            </button>
          </div>
        </div>
      </form>

      <MediaLibraryDialog
        open={mediaContext !== null}
        onClose={closeMediaDialog}
        onSelect={handleMediaSelect}
      />
    </div>
  );
};

export default ProductsPage;
