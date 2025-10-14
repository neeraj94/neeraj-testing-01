import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../components/PageHeader';
import PageSection from '../components/PageSection';
import PaginationControls from '../components/PaginationControls';
import MediaLibraryDialog from '../components/MediaLibraryDialog';
import RichTextEditor from '../components/RichTextEditor';
import TagsInput from '../components/TagsInput';
import StarRating from '../components/StarRating';
import ImagePreview from '../components/ImagePreview';
import { useToast } from '../components/ToastProvider';
import { useConfirm } from '../components/ConfirmDialogProvider';
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
  CreateProductReviewPayload,
  DiscountType,
  ProductAssetUploadResponse,
  ProductDetail,
  ProductReview,
  ProductSummary,
  ProductSummaryPage,
  StockVisibilityState
} from '../types/product';
import { extractErrorMessage } from '../utils/errors';
import { formatCurrency } from '../utils/currency';

interface ProductFormState {
  name: string;
  brandId: string;
  unit: string;
  weightKg: string;
  minPurchaseQuantity: string;
  featured: 'yes' | 'no';
  todaysDeal: 'yes' | 'no';
  shortDescription: string;
  description: string;
  videoProvider: string;
  videoUrl: string;
  unitPrice: string;
  discountValue: string;
  discountType: DiscountType;
  discountMinQuantity: string;
  discountMaxQuantity: string;
  discountStartAt: string;
  discountEndAt: string;
  tags: string[];
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
  infoSections: ProductInfoSectionFormState[];
}

interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[];
}

interface ProductInfoSectionFormState {
  id: string;
  title: string;
  content: string;
  bulletsText: string;
  expanded: boolean;
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

interface ExpandableSectionFormState {
  id: string;
  title: string;
  content: string;
}

interface UploadedFileUploadResponse {
  url: string;
  storageKey?: string | null;
  originalFilename?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
}

type MediaDialogContext =
  | { type: 'gallery' }
  | { type: 'thumbnail' }
  | { type: 'pdf' }
  | { type: 'metaImage' }
  | { type: 'variant'; key: string };

const MEDIA_MODULE_FILTERS: Record<MediaDialogContext['type'], string[]> = {
  gallery: ['PRODUCT_GALLERY_IMAGE'],
  thumbnail: ['PRODUCT_THUMBNAIL'],
  pdf: ['PRODUCT_PDF_SPEC'],
  metaImage: ['PRODUCT_META_IMAGE'],
  variant: ['PRODUCT_VARIANT_IMAGE']
};

const defaultFormState: ProductFormState = {
  name: '',
  brandId: '',
  unit: '',
  weightKg: '',
  minPurchaseQuantity: '',
  featured: 'no',
  todaysDeal: 'no',
  shortDescription: '',
  description: '',
  videoProvider: 'YOUTUBE',
  videoUrl: '',
  unitPrice: '',
  discountValue: '',
  discountType: 'FLAT',
  discountMinQuantity: '',
  discountMaxQuantity: '',
  discountStartAt: '',
  discountEndAt: '',
  tags: [],
  stockQuantity: '',
  sku: '',
  externalLink: '',
  externalLinkButton: '',
  lowStockWarning: '',
  stockVisibility: 'SHOW_QUANTITY',
  metaTitle: '',
  metaDescription: '',
  metaKeywords: '',
  metaCanonicalUrl: '',
  infoSections: []
};

const generateSectionId = () => Math.random().toString(36).slice(2, 10);

const unitOptions = [
  'Piece',
  'Pack',
  'Kilogram',
  'Gram',
  'Litre',
  'Millilitre',
  'Meter',
  'Centimeter',
  'Inch',
  'Foot',
  'Dozen',
  'Set',
  'Pair'
] as const;

const CUSTOM_UNIT_OPTION = '__CUSTOM__';

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
  { id: 'basic', label: 'Basic Info' },
  { id: 'media', label: 'Media' },
  { id: 'pricing', label: 'Price & Stock' },
  { id: 'seo', label: 'SEO' },
  { id: 'shipping', label: 'Shipping' },
  { id: 'warranty', label: 'Warranty' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'frequentlyBought', label: 'Frequently Bought' }
] as const;

type TabId = (typeof tabs)[number]['id'];

type ValidationMessages = {
  name?: string;
  brandId?: string;
  unit?: string;
  categories?: string;
  description?: string;
  unitPrice?: string;
  discountWindow?: string;
};

const validationFieldTab: Record<keyof ValidationMessages, TabId> = {
  name: 'basic',
  brandId: 'basic',
  unit: 'basic',
  categories: 'basic',
  description: 'basic',
  unitPrice: 'pricing',
  discountWindow: 'pricing'
};

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 25, 50];

const mediaAssetToSelection = (
  asset?: {
    url: string;
    storageKey?: string | null;
    originalFilename?: string | null;
    mimeType?: string | null;
    sizeBytes?: number | null;
  } | null
): MediaSelection | null => {
  if (!asset) {
    return null;
  }
  return {
    url: asset.url,
    storageKey: asset.storageKey ?? null,
    originalFilename: asset.originalFilename ?? null,
    mimeType: asset.mimeType ?? null,
    sizeBytes: asset.sizeBytes ?? null
  };
};

const reviewToPayload = (
  review: ProductReview,
  overrides: Partial<CreateProductReviewPayload> = {}
): CreateProductReviewPayload => {
  const media = (review.media ?? [])
    .map((asset) => mediaAssetToSelection(asset))
    .filter((asset): asset is MediaSelection => Boolean(asset));
  const payload: CreateProductReviewPayload = {
    productId: review.productId,
    customerId: review.customerId,
    reviewerName: review.customerId ? undefined : review.reviewerName ?? undefined,
    reviewerAvatar: review.customerId ? undefined : mediaAssetToSelection(review.reviewerAvatar) ?? undefined,
    rating: review.rating,
    comment: review.comment ?? undefined,
    reviewedAt: review.reviewedAt,
    media,
    published: review.published
  };
  return { ...payload, ...overrides };
};

const toDateTimeInput = (iso?: string | null) => {
  if (!iso) {
    return '';
  }
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) {
    return '';
  }
  const pad = (value: number) => String(value).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

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

  const sortNodes = (list: CategoryTreeNode[]): CategoryTreeNode[] =>
    list
      .map((node): CategoryTreeNode => ({
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

const toIsoOrNull = (value: string): string | null => {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }
  const date = new Date(normalized);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
};

const formatVariantLabel = (combination: VariantCombinationValue[]) =>
  combination.map((part) => `${part.attributeName}: ${part.valueName}`).join(' · ');
const ProductsPage = () => {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { notify } = useToast();
  const permissions = useAppSelector((state) => state.auth.permissions);
  const baseCurrency = useAppSelector((state) => state.settings.theme.baseCurrency);

  const [panelMode, setPanelMode] = useState<'list' | 'create' | 'edit'>('list');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<TabId>('basic');
  const [form, setForm] = useState<ProductFormState>({ ...defaultFormState, infoSections: [] });
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [selectedTaxIds, setSelectedTaxIds] = useState<number[]>([]);
  const [gallery, setGallery] = useState<MediaSelection[]>([]);
  const [thumbnail, setThumbnail] = useState<MediaSelection | null>(null);
  const [pdfSpecification, setPdfSpecification] = useState<MediaSelection | null>(null);
  const [metaImage, setMetaImage] = useState<MediaSelection | null>(null);
  const [frequentlyBoughtProducts, setFrequentlyBoughtProducts] = useState<ProductSummary[]>([]);
  const [frequentlyBoughtCategoryIds, setFrequentlyBoughtCategoryIds] = useState<number[]>([]);
  const [frequentlyBoughtSearch, setFrequentlyBoughtSearch] = useState('');
  const [frequentlyBoughtDropdownOpen, setFrequentlyBoughtDropdownOpen] = useState(false);
  const frequentlyBoughtDropdownRef = useRef<HTMLDivElement | null>(null);
  const [frequentlyBoughtCategorySearch, setFrequentlyBoughtCategorySearch] = useState('');
  const [expandableSections, setExpandableSections] = useState<ExpandableSectionFormState[]>([]);
  const [mediaContext, setMediaContext] = useState<MediaDialogContext | null>(null);
  const [selectedAttributes, setSelectedAttributes] = useState<AttributeSelection[]>([]);
  const [variants, setVariants] = useState<Record<string, ProductVariantFormState>>({});
  const [unitMode, setUnitMode] = useState<'preset' | 'custom'>('preset');
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(() => new Set());
  const [brandDropdownOpen, setBrandDropdownOpen] = useState(false);
  const [taxDropdownOpen, setTaxDropdownOpen] = useState(false);
  const [brandSearch, setBrandSearch] = useState('');
  const [showValidation, setShowValidation] = useState(false);
  const [reviewVisibilityUpdatingId, setReviewVisibilityUpdatingId] = useState<number | null>(null);

  const brandDropdownRef = useRef<HTMLDivElement | null>(null);
  const taxDropdownRef = useRef<HTMLDivElement | null>(null);
  const brandSearchInputRef = useRef<HTMLInputElement | null>(null);
  const editInitializedRef = useRef(false);

  const createSectionId = () => `section-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`;

  const canCreate = useMemo(
    () => hasAnyPermission(permissions as PermissionKey[], ['PRODUCT_CREATE']),
    [permissions]
  );
  const canUpdate = useMemo(
    () => hasAnyPermission(permissions as PermissionKey[], ['PRODUCT_UPDATE', 'PRODUCT_CREATE']),
    [permissions]
  );
  const canDelete = useMemo(
    () => hasAnyPermission(permissions as PermissionKey[], ['PRODUCT_DELETE']),
    [permissions]
  );
  const canUpdateReviews = useMemo(
    () => hasAnyPermission(permissions as PermissionKey[], ['PRODUCT_REVIEW_UPDATE']),
    [permissions]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchDraft.trim());
      setPage(0);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchDraft]);

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

  const productsQuery = useQuery({
    queryKey: ['products', { page, pageSize, search }],
    queryFn: async () => {
      const { data } = await api.get<ProductSummaryPage>('/products', {
        params: { page, size: pageSize, search: search || undefined }
      });
      return data;
    },
    enabled: panelMode === 'list'
  });

  const products = productsQuery.data?.content ?? [];
  const totalElements = productsQuery.data?.totalElements ?? 0;

  const frequentlyBoughtSearchTerm = frequentlyBoughtSearch.trim();
  const frequentlyBoughtSuggestionsQuery = useQuery({
    queryKey: [
      'products',
      'frequently-bought-selector',
      { term: frequentlyBoughtSearchTerm }
    ],
    queryFn: async () => {
      const params: Record<string, unknown> = { page: 0, size: 50 };
      if (frequentlyBoughtSearchTerm) {
        params.search = frequentlyBoughtSearchTerm;
      }
      const { data } = await api.get<ProductSummaryPage>('/products', { params });
      return data.content ?? [];
    },
    enabled: frequentlyBoughtDropdownOpen,
    staleTime: 60_000
  });

  const frequentlyBoughtSuggestions = frequentlyBoughtSuggestionsQuery.data ?? [];

  const categoryTree = useMemo(
    () => buildCategoryTree(categoriesQuery.data ?? []),
    [categoriesQuery.data]
  );

  useEffect(() => {
    if (!categoryTree.length) {
      setExpandedCategories(new Set());
      return;
    }
    const next = new Set<number>();
    const collect = (nodes: CategoryTreeNode[]) => {
      nodes.forEach((node) => {
        if (node.children.length) {
          next.add(node.id);
          collect(node.children);
        }
      });
    };
    collect(categoryTree);
    setExpandedCategories(next);
  }, [categoryTree]);

  useEffect(() => {
    if (!frequentlyBoughtDropdownOpen) {
      setFrequentlyBoughtSearch('');
      return;
    }
    const handleClickAway = (event: MouseEvent) => {
      if (
        frequentlyBoughtDropdownRef.current &&
        !frequentlyBoughtDropdownRef.current.contains(event.target as Node)
      ) {
        setFrequentlyBoughtDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickAway);
    return () => document.removeEventListener('mousedown', handleClickAway);
  }, [frequentlyBoughtDropdownOpen]);

  useEffect(() => {
    if (form.unit && !unitOptions.includes(form.unit as (typeof unitOptions)[number])) {
      setUnitMode('custom');
    }
  }, [form.unit]);

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
      const timeout = window.setTimeout(() => {
        brandSearchInputRef.current?.focus();
      }, 0);
      document.addEventListener('mousedown', handleClickAway);
      return () => {
        window.clearTimeout(timeout);
        document.removeEventListener('mousedown', handleClickAway);
      };
    }

    setBrandSearch('');

    return () => {
      document.removeEventListener('mousedown', handleClickAway);
    };
  }, [brandDropdownOpen]);

  useEffect(() => {
    const handleClickAway = (event: MouseEvent) => {
      if (!taxDropdownRef.current) {
        return;
      }
      if (!taxDropdownRef.current.contains(event.target as Node)) {
        setTaxDropdownOpen(false);
      }
    };

    if (taxDropdownOpen) {
      document.addEventListener('mousedown', handleClickAway);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickAway);
    };
  }, [taxDropdownOpen]);

  const productDetailQuery = useQuery({
    queryKey: ['products', 'detail', editingId],
    queryFn: async () => {
      if (editingId == null) {
        throw new Error('No product selected');
      }
      const { data } = await api.get<ProductDetail>(`/products/${editingId}`);
      return data;
    },
    enabled: panelMode === 'edit' && editingId !== null
  });

  const createMutation = useMutation({
    mutationFn: async (payload: CreateProductPayload) => {
      await api.post('/products', payload);
    },
    onSuccess: () => {
      notify({ type: 'success', message: 'Product created successfully.' });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      closeForm();
    },
    onError: (error: unknown) => {
      notify({
        type: 'error',
        message: extractErrorMessage(error, 'Unable to create product. Please try again later.')
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: CreateProductPayload }) => {
      await api.put(`/products/${id}`, payload);
    },
    onSuccess: () => {
      notify({ type: 'success', message: 'Product updated successfully.' });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      closeForm();
    },
    onError: (error: unknown) => {
      notify({
        type: 'error',
        message: extractErrorMessage(error, 'Unable to update product. Please try again later.')
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/products/${id}`);
    },
    onSuccess: () => {
      notify({ type: 'success', message: 'Product deleted successfully.' });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error: unknown) => {
      notify({
        type: 'error',
        message: extractErrorMessage(error, 'Unable to delete product. Please try again later.')
      });
    }
  });

  const toggleReviewVisibilityMutation = useMutation({
    mutationFn: async ({ review, published }: { review: ProductReview; published: boolean }) => {
      const payload = reviewToPayload(review, { published });
      await api.put(`/product-reviews/${review.id}`, payload);
      return { review, published };
    },
    onMutate: ({ review }) => {
      setReviewVisibilityUpdatingId(review.id);
    },
    onSuccess: (_data, variables) => {
      notify({
        type: 'success',
        message: variables.published ? 'Review enabled successfully.' : 'Review hidden successfully.'
      });
      queryClient.invalidateQueries({ queryKey: ['products', 'detail', variables.review.productId] });
      queryClient.invalidateQueries({ queryKey: ['product-reviews'] });
    },
    onError: (error: unknown) => {
      notify({
        type: 'error',
        message: extractErrorMessage(error, 'Unable to update review visibility. Please try again later.')
      });
    },
    onSettled: () => {
      setReviewVisibilityUpdatingId(null);
    }
  });

  const closeForm = () => {
    resetFormState();
    setPanelMode('list');
    setEditingId(null);
  };

  const openCreateForm = () => {
    resetFormState();
    setActiveTab('basic');
    setPanelMode('create');
    setEditingId(null);
  };

  const openEditForm = (productId: number) => {
    resetFormState();
    setActiveTab('basic');
    setShowValidation(false);
    editInitializedRef.current = false;
    queryClient.removeQueries({ queryKey: ['products', 'detail', productId], exact: true });
    setEditingId(productId);
    setPanelMode('edit');
  };

  const handleDelete = async (product: ProductSummary) => {
    if (!canDelete) {
      return;
    }
    const confirmed = await confirm({
      title: 'Delete product?',
      description: `Delete product "${product.name}"? This action cannot be undone.`,
      confirmLabel: 'Delete',
      tone: 'danger'
    });
    if (!confirmed) {
      return;
    }
    await deleteMutation.mutateAsync(product.id);
  };

  const handleCancel = () => {
    closeForm();
  };

  const populateFormFromProduct = (product: ProductDetail) => {
    const sectionForms: ProductInfoSectionFormState[] = (product.infoSections ?? []).map((section, index) => ({
      id: `section-${section.id ?? index}-${index}`,
      title: section.title ?? '',
      content: section.content ?? '',
      bulletsText: (section.bulletPoints ?? []).join('\n'),
      expanded: index === 0
    }));

    setForm({
      name: product.name ?? '',
      brandId: product.brand ? String(product.brand.id) : '',
      unit: product.unit ?? '',
      weightKg: product.weightKg != null ? String(product.weightKg) : '',
      minPurchaseQuantity:
        product.minPurchaseQuantity != null ? String(product.minPurchaseQuantity) : '',
      featured: product.featured ? 'yes' : 'no',
      todaysDeal: product.todaysDeal ? 'yes' : 'no',
      shortDescription: product.shortDescription ?? '',
      description: product.description ?? '',
      videoProvider: product.videoProvider ?? 'YOUTUBE',
      videoUrl: product.videoUrl ?? '',
      unitPrice: product.pricing.unitPrice != null ? String(product.pricing.unitPrice) : '',
      discountValue: product.pricing.discountValue != null ? String(product.pricing.discountValue) : '',
      discountType: product.pricing.discountType,
      discountMinQuantity:
        product.pricing.discountMinQuantity != null
          ? String(product.pricing.discountMinQuantity)
          : '',
      discountMaxQuantity:
        product.pricing.discountMaxQuantity != null
          ? String(product.pricing.discountMaxQuantity)
          : '',
      discountStartAt: toDateTimeInput(product.pricing.discountStartAt ?? null),
      discountEndAt: toDateTimeInput(product.pricing.discountEndAt ?? null),
      tags: [...(product.pricing.tags ?? [])],
      stockQuantity: product.pricing.stockQuantity != null ? String(product.pricing.stockQuantity) : '',
      sku: product.pricing.sku ?? '',
      externalLink: product.pricing.externalLink ?? '',
      externalLinkButton: product.pricing.externalLinkButton ?? '',
      lowStockWarning:
        product.pricing.lowStockWarning != null ? String(product.pricing.lowStockWarning) : '',
      stockVisibility: product.pricing.stockVisibility,
      metaTitle: product.seo.title ?? '',
      metaDescription: product.seo.description ?? '',
      metaKeywords: product.seo.keywords ?? '',
      metaCanonicalUrl: product.seo.canonicalUrl ?? '',
      infoSections: sectionForms
    });

    setSelectedCategoryIds(product.categories.map((category) => category.id));
    setSelectedTaxIds(product.taxRates.map((tax) => tax.id));

    const gallerySelections = (product.gallery ?? [])
      .map((asset) => mediaAssetToSelection(asset))
      .filter((asset): asset is MediaSelection => asset !== null);
    setGallery(gallerySelections);
    setThumbnail(mediaAssetToSelection(product.thumbnail));
    setPdfSpecification(mediaAssetToSelection(product.pdfSpecification));
    setMetaImage(mediaAssetToSelection(product.seo.image));
    const sanitizedFrequentlyBought = (product.frequentlyBoughtProducts ?? [])
      .filter((item) => item.id !== product.id);
    setFrequentlyBoughtProducts(sanitizedFrequentlyBought);
    setFrequentlyBoughtCategoryIds([...(product.frequentlyBoughtCategoryIds ?? [])]);
    setFrequentlyBoughtSearch('');
    setFrequentlyBoughtCategorySearch('');
    setExpandableSections(
      (product.expandableSections ?? []).map((section) => ({
        id: generateSectionId(),
        title: section.title ?? '',
        content: section.content ?? ''
      }))
    );

    const attributeCatalog = attributesQuery.data ?? [];
    const nextSelectedAttributes = product.attributes.map((attribute) => {
      const catalogAttribute = attributeCatalog.find((entry) => entry.id === attribute.attributeId);
      const values: AttributeValue[] = catalogAttribute?.values ??
        attribute.values.map((value) => ({
          id: value.id,
          value: value.value,
          sortOrder: value.sortOrder ?? 0
        }));
      return {
        attributeId: attribute.attributeId,
        attributeName: attribute.attributeName,
        values,
        selectedValueIds: attribute.values.map((value) => value.id)
      } satisfies AttributeSelection;
    });
    setSelectedAttributes(nextSelectedAttributes);

    const nextVariants: Record<string, ProductVariantFormState> = {};
    product.variants.forEach((variant) => {
      const combination = variant.values.map((value) => ({
        attributeId: value.attributeId,
        attributeName: value.attributeName,
        valueId: value.valueId,
        valueName: value.value
      }));
      const mediaSelections = (variant.media ?? [])
        .map((asset) => mediaAssetToSelection(asset))
        .filter((asset): asset is MediaSelection => asset !== null);
      nextVariants[variant.key] = {
        combination,
        priceAdjustment: variant.priceAdjustment != null ? String(variant.priceAdjustment) : '',
        sku: variant.sku ?? '',
        quantity: variant.quantity != null ? String(variant.quantity) : '',
        media: mediaSelections
      };
    });
    setVariants(nextVariants);

    if (product.unit && unitOptions.includes(product.unit as (typeof unitOptions)[number])) {
      setUnitMode('preset');
    } else {
      setUnitMode('custom');
    }

    setActiveTab('basic');
    setShowValidation(false);
  };

  const handleResetClick = () => {
    if (panelMode === 'edit' && productDetailQuery.data) {
      populateFormFromProduct(productDetailQuery.data);
      setShowValidation(false);
      return;
    }
    resetFormState();
  };

  useEffect(() => {
    if (panelMode !== 'edit') {
      editInitializedRef.current = false;
      return;
    }
    if (attributesQuery.isLoading || !productDetailQuery.data) {
      return;
    }
    if (editInitializedRef.current) {
      return;
    }
    populateFormFromProduct(productDetailQuery.data);
    editInitializedRef.current = true;
  }, [panelMode, productDetailQuery.data, attributesQuery.isLoading, attributesQuery.data]);

  const selectedBrand = useMemo(() => {
    const brands = brandsQuery.data ?? [];
    return brands.find((brand) => String(brand.id) === form.brandId) ?? null;
  }, [brandsQuery.data, form.brandId]);

  const filteredBrands = useMemo(() => {
    const brands = brandsQuery.data ?? [];
    const term = brandSearch.trim().toLowerCase();
    if (!term) {
      return brands;
    }
    return brands.filter((brand) => brand.name.toLowerCase().includes(term));
  }, [brandsQuery.data, brandSearch]);

  const categoriesById = useMemo(() => {
    const map = new Map<number, Category>();
    (categoriesQuery.data ?? []).forEach((category) => {
      map.set(category.id, category);
    });
    return map;
  }, [categoriesQuery.data]);

  const categoryPathMap = useMemo(() => {
    const categories = categoriesQuery.data ?? [];
    const lookup = new Map<number, Category>();
    categories.forEach((category) => {
      lookup.set(category.id, category);
    });
    const cache = new Map<number, string>();
    const resolvePath = (category: Category | undefined): string => {
      if (!category) {
        return '';
      }
      if (cache.has(category.id)) {
        return cache.get(category.id) ?? category.name;
      }
      const segments: string[] = [];
      let current: Category | undefined = category;
      const visited = new Set<number>();
      while (current && !visited.has(current.id)) {
        segments.unshift(current.name);
        visited.add(current.id);
        current = current.parentId ? lookup.get(current.parentId) : undefined;
      }
      const path = segments.filter(Boolean).join(' › ');
      cache.set(category.id, path);
      return path;
    };
    const map = new Map<number, string>();
    categories.forEach((category) => {
      map.set(category.id, resolvePath(category));
    });
    return map;
  }, [categoriesQuery.data]);

  const frequentlyBoughtCategoryOptions = useMemo(
    () =>
      Array.from(categoryPathMap.entries())
        .map(([id, label]) => ({ id, label }))
        .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })),
    [categoryPathMap]
  );

  const filteredFrequentlyBoughtCategories = useMemo(() => {
    const term = frequentlyBoughtCategorySearch.trim().toLowerCase();
    const options = frequentlyBoughtCategoryOptions;
    if (!term) {
      return options.slice(0, 30);
    }
    return options.filter((option) => option.label.toLowerCase().includes(term)).slice(0, 30);
  }, [frequentlyBoughtCategoryOptions, frequentlyBoughtCategorySearch]);

  const selectedFrequentlyBoughtCategories = useMemo(
    () =>
      frequentlyBoughtCategoryIds.map((id) => ({
        id,
        label: categoryPathMap.get(id) ?? `Category #${id}`
      })),
    [frequentlyBoughtCategoryIds, categoryPathMap]
  );

  const selectedTaxes = useMemo(() => {
    const taxes = taxRatesQuery.data ?? [];
    return taxes.filter((tax) => selectedTaxIds.includes(tax.id));
  }, [taxRatesQuery.data, selectedTaxIds]);

  const activeProductId = panelMode === 'edit' && productDetailQuery.data ? productDetailQuery.data.id : null;

  const frequentlyBoughtSelectedIds = useMemo(
    () => new Set(frequentlyBoughtProducts.map((product) => product.id)),
    [frequentlyBoughtProducts]
  );

  const frequentlyBoughtDropdownOptions = useMemo(() => {
    const options = new Map<number, ProductSummary>();
    const selectionOrder = new Map<number, number>();
    frequentlyBoughtProducts.forEach((product, index) => {
      if (activeProductId != null && product.id === activeProductId) {
        return;
      }
      options.set(product.id, product);
      selectionOrder.set(product.id, index);
    });
    frequentlyBoughtSuggestions.forEach((product) => {
      if (activeProductId != null && product.id === activeProductId) {
        return;
      }
      if (!options.has(product.id)) {
        options.set(product.id, product);
      }
    });
    return Array.from(options.values()).sort((a, b) => {
      const aSelected = frequentlyBoughtSelectedIds.has(a.id);
      const bSelected = frequentlyBoughtSelectedIds.has(b.id);
      if (aSelected !== bSelected) {
        return aSelected ? -1 : 1;
      }
      if (aSelected && bSelected) {
        return (selectionOrder.get(a.id) ?? 0) - (selectionOrder.get(b.id) ?? 0);
      }
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
  }, [
    frequentlyBoughtProducts,
    frequentlyBoughtSuggestions,
    activeProductId,
    frequentlyBoughtSelectedIds
  ]);

  const sanitizedDescription = useMemo(() => {
    const html = form.description || '';
    const text = html
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return text;
  }, [form.description]);

  const validation = useMemo<ValidationMessages>(() => {
    const messages: ValidationMessages = {};
    if (!form.name.trim()) {
      messages.name = 'Product name is required.';
    }
    if (!form.brandId) {
      messages.brandId = 'Select a brand.';
    }
    if (!form.unit.trim()) {
      messages.unit = unitMode === 'custom' ? 'Enter a custom unit.' : 'Select a unit from the list.';
    }
    if (!selectedCategoryIds.length) {
      messages.categories = 'Select at least one category.';
    }
    const price = Number(form.unitPrice);
    if (!form.unitPrice.trim() || Number.isNaN(price) || price < 0) {
      messages.unitPrice = 'Enter a valid unit price.';
    }
    if (!sanitizedDescription) {
      messages.description = 'Describe the product to help merchandisers and SEO.';
    }
    const startValue = form.discountStartAt.trim();
    const endValue = form.discountEndAt.trim();
    if (startValue && endValue) {
      const start = new Date(startValue);
      const end = new Date(endValue);
      if (Number.isFinite(start.getTime()) && Number.isFinite(end.getTime()) && end < start) {
        messages.discountWindow = 'Discount end must be on or after the start.';
      }
    }
    return messages;
  }, [
    form.name,
    form.brandId,
    form.unit,
    form.unitPrice,
    form.discountStartAt,
    form.discountEndAt,
    selectedCategoryIds,
    sanitizedDescription,
    unitMode
  ]);

  const validationMessages = useMemo(
    () => Object.values(validation).filter((message): message is string => Boolean(message)),
    [validation]
  );

  const visibleValidation = useMemo<ValidationMessages>(
    () => (showValidation ? validation : {}),
    [showValidation, validation]
  );

  const productReviews = productDetailQuery.data?.reviews ?? [];
  const reviewSummary = useMemo(() => {
    if (!productReviews.length) {
      return {
        total: 0,
        average: 0,
        breakdown: [5, 4, 3, 2, 1].map((score) => ({ score, count: 0 }))
      } as const;
    }
    const counts = [0, 0, 0, 0, 0];
    productReviews.forEach((review) => {
      const rating = Math.min(Math.max(Math.round(review.rating ?? 0), 1), 5);
      counts[rating - 1] += 1;
    });
    const breakdown = [5, 4, 3, 2, 1].map((score) => ({ score, count: counts[score - 1] }));
    const average =
      productReviews.reduce((sum, review) => sum + (review.rating ?? 0), 0) / productReviews.length;
    return { total: productReviews.length, average, breakdown };
  }, [productReviews]);

  const isVideoAsset = (asset: { url: string; mimeType?: string | null }) => {
    if (asset.mimeType && asset.mimeType.toLowerCase().startsWith('video/')) {
      return true;
    }
    return /\.(mp4|webm|ogg|mov)$/i.test(asset.url);
  };

  const toggleCategorySelection = (categoryId: number) => {
    setSelectedCategoryIds((previous) =>
      previous.includes(categoryId)
        ? previous.filter((id) => id !== categoryId)
        : [...previous, categoryId]
    );
  };

  const toggleCategoryExpansion = (categoryId: number) => {
    setExpandedCategories((previous) => {
      const next = new Set(previous);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
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

  const addInfoSection = () => {
    setForm((previous) => ({
      ...previous,
      infoSections: [
        ...previous.infoSections,
        {
          id: createSectionId(),
          title: '',
          content: '',
          bulletsText: '',
          expanded: true
        }
      ]
    }));
  };

  const updateInfoSection = (id: string, changes: Partial<ProductInfoSectionFormState>) => {
    setForm((previous) => ({
      ...previous,
      infoSections: previous.infoSections.map((section) =>
        section.id === id ? { ...section, ...changes } : section
      )
    }));
  };

  const removeInfoSection = (id: string) => {
    setForm((previous) => ({
      ...previous,
      infoSections: previous.infoSections.filter((section) => section.id !== id)
    }));
  };

  const toggleInfoSection = (id: string) => {
    setForm((previous) => ({
      ...previous,
      infoSections: previous.infoSections.map((section) =>
        section.id === id ? { ...section, expanded: !section.expanded } : section
      )
    }));
  };

  const moveInfoSection = (id: string, direction: 'up' | 'down') => {
    setForm((previous) => {
      const index = previous.infoSections.findIndex((section) => section.id === id);
      if (index === -1) {
        return previous;
      }
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= previous.infoSections.length) {
        return previous;
      }
      const nextSections = [...previous.infoSections];
      const [moved] = nextSections.splice(index, 1);
      nextSections.splice(targetIndex, 0, moved);
      return { ...previous, infoSections: nextSections };
    });
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

  const addExpandableSection = () => {
    setExpandableSections((previous) => [
      ...previous,
      { id: generateSectionId(), title: '', content: '' }
    ]);
  };

  const updateExpandableSection = (id: string, field: 'title' | 'content', value: string) => {
    setExpandableSections((previous) =>
      previous.map((section) =>
        section.id === id
          ? {
              ...section,
              [field]: value
            }
          : section
      )
    );
  };

  const removeExpandableSection = (id: string) => {
    setExpandableSections((previous) => previous.filter((section) => section.id !== id));
  };

  const moveExpandableSection = (id: string, direction: 'up' | 'down') => {
    setExpandableSections((previous) => {
      const index = previous.findIndex((section) => section.id === id);
      if (index === -1) {
        return previous;
      }
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= previous.length) {
        return previous;
      }
      const next = [...previous];
      const [item] = next.splice(index, 1);
      next.splice(newIndex, 0, item);
      return next;
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

  const handleProductReviewVisibilityChange = (review: ProductReview, published: boolean) => {
    if (!canUpdateReviews) {
      notify({ type: 'error', message: 'You do not have permission to update reviews.' });
      return;
    }
    if (review.published === published) {
      return;
    }
    if (toggleReviewVisibilityMutation.isPending && reviewVisibilityUpdatingId === review.id) {
      return;
    }
    toggleReviewVisibilityMutation.mutate({ review, published });
  };

  const handleToggleFrequentlyBoughtProduct = (product: ProductSummary) => {
    setFrequentlyBoughtProducts((previous) => {
      const exists = previous.some((item) => item.id === product.id);
      if (exists) {
        return previous.filter((item) => item.id !== product.id);
      }
      return [...previous, product];
    });
  };

  const handleRemoveFrequentlyBoughtProduct = (productId: number) => {
    setFrequentlyBoughtProducts((previous) => previous.filter((item) => item.id !== productId));
  };

  const handleToggleFrequentlyBoughtCategory = (categoryId: number) => {
    setFrequentlyBoughtCategoryIds((previous) =>
      previous.includes(categoryId)
        ? previous.filter((id) => id !== categoryId)
        : [...previous, categoryId]
    );
  };

  const resetFormState = () => {
    setForm({ ...defaultFormState, infoSections: [], tags: [] });
    setSelectedCategoryIds([]);
    setSelectedTaxIds([]);
    setGallery([]);
    setThumbnail(null);
    setPdfSpecification(null);
    setMetaImage(null);
    setFrequentlyBoughtProducts([]);
    setFrequentlyBoughtCategoryIds([]);
    setFrequentlyBoughtSearch('');
    setFrequentlyBoughtDropdownOpen(false);
    setFrequentlyBoughtCategorySearch('');
    setExpandableSections([]);
    setSelectedAttributes([]);
    setVariants({});
    setUnitMode('preset');
    setBrandDropdownOpen(false);
    setTaxDropdownOpen(false);
    setActiveTab('basic');
    setBrandSearch('');
    setShowValidation(false);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const isCreateMode = panelMode === 'create';
    const isEditMode = panelMode === 'edit';
    const isSaving = createMutation.isPending || updateMutation.isPending;

    if (isCreateMode && !canCreate) {
      notify({ type: 'error', message: 'You do not have permission to create products.' });
      return;
    }
    if (isEditMode && !canUpdate) {
      notify({ type: 'error', message: 'You do not have permission to update products.' });
      return;
    }

    if (isSaving) {
      return;
    }

    setShowValidation(true);

    const blockingFields = Object.entries(validation).filter(([, message]) => Boolean(message)) as [
      keyof ValidationMessages,
      string
    ][];
    if (blockingFields.length) {
      const [field] = blockingFields[0];
      setActiveTab(validationFieldTab[field]);
      notify({
        type: 'error',
        message: 'Please resolve the highlighted fields before saving the product.'
      });
      return;
    }

    const discountStartAt = toIsoOrNull(form.discountStartAt);
    const discountEndAt = toIsoOrNull(form.discountEndAt);
    const tags = form.tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0);

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
      shortDescription: form.shortDescription.trim(),
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
        discountStartAt,
        discountEndAt,
        tags,
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
      }),
      expandableSections: expandableSections
        .map((section) => {
          const title = section.title.trim();
          const content = section.content.trim();
          return {
            title,
            content
          };
        })
        .filter((section) => section.title.length > 0 || section.content.length > 0),
      infoSections: form.infoSections.map((section) => ({
        title: section.title.trim(),
        content: section.content,
        bulletPoints: section.bulletsText
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.length > 0)
      })),
      frequentlyBoughtProductIds: frequentlyBoughtProducts.map((product) => product.id),
      frequentlyBoughtCategoryIds
    };

    if (isEditMode && editingId != null) {
      updateMutation.mutate({ id: editingId, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const renderCategoryNodes = (nodes: CategoryTreeNode[], depth = 0): JSX.Element[] => {
    return nodes.map((node) => {
      const isExpanded = expandedCategories.has(node.id) || !node.children.length;
      const isSelected = selectedCategoryIds.includes(node.id);
      return (
        <div key={node.id} className="space-y-2">
          <div className="flex items-center gap-2">
            {node.children.length ? (
              <button
                type="button"
                onClick={() => toggleCategoryExpansion(node.id)}
                className="inline-flex h-6 w-6 items-center justify-center rounded border border-slate-300 bg-white text-xs text-slate-500 transition hover:border-slate-400 hover:text-slate-700"
                aria-label={isExpanded ? 'Collapse category' : 'Expand category'}
              >
                {isExpanded ? '▾' : '▸'}
              </button>
            ) : (
              <span className="inline-flex h-6 w-6 items-center justify-center text-slate-300">•</span>
            )}
            <label
              className={`flex flex-1 items-center gap-2 rounded-lg px-2 py-1 text-sm transition ${
                isSelected ? 'bg-primary/5 text-primary' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                checked={isSelected}
                onChange={() => toggleCategorySelection(node.id)}
              />
              <span className="font-medium">{node.name}</span>
            </label>
          </div>
          {isExpanded && node.children.length > 0 && (
            <div className="ml-6 border-l border-dashed border-slate-200 pl-4">
              {renderCategoryNodes(node.children, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  const openMediaDialog = (context: MediaDialogContext) => {
    setMediaContext(context);
  };

  const closeMediaDialog = () => {
    setMediaContext(null);
  };

  const handleMediaUpload = async (files: File[]): Promise<MediaSelection[]> => {
    if (!mediaContext) {
      return [];
    }
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));

    let endpoint: string | null = null;
    switch (mediaContext.type) {
      case 'gallery':
        endpoint = '/products/assets/gallery';
        break;
      case 'thumbnail':
        endpoint = '/products/assets/thumbnail';
        break;
      case 'pdf':
        endpoint = '/products/assets/pdf';
        break;
      case 'metaImage':
        endpoint = '/products/assets/meta-image';
        break;
      case 'variant':
        endpoint = '/products/assets/variant';
        break;
      default:
        endpoint = null;
    }

    if (!endpoint) {
      return [];
    }

    try {
      const { data } = await api.post<ProductAssetUploadResponse[]>(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      return data.map((item) => ({
        url: item.url,
        storageKey: item.storageKey ?? null,
        originalFilename: item.originalFilename ?? null,
        mimeType: item.mimeType ?? null,
        sizeBytes: item.sizeBytes ?? null
      }));
    } catch (error) {
      notify({
        type: 'error',
        message: extractErrorMessage(error, 'Unable to upload files. Please try again.')
      });
      throw error;
    }
  };

  const handleMediaUploadComplete = (selections: MediaSelection[]) => {
    if (!mediaContext || selections.length === 0) {
      return;
    }

    switch (mediaContext.type) {
      case 'gallery':
        setGallery((previous) => [...previous, ...selections]);
        break;
      case 'thumbnail':
        setThumbnail(selections[0]);
        break;
      case 'pdf':
        setPdfSpecification(selections[0]);
        break;
      case 'metaImage':
        setMetaImage(selections[0]);
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
              media: [...variant.media, ...selections]
            }
          };
        });
        break;
      default:
        break;
    }

    notify({
      type: 'success',
      message:
        selections.length > 1
          ? 'Uploaded files added to the product.'
          : 'Uploaded file added to the product.'
    });

    setMediaContext(null);
  };

  const handleMediaSelect = (selection: MediaSelection) => {
    if (!mediaContext) {
      return;
    }

    const selections = Array.isArray(selection) ? selection : [selection];
    if (!selections.length) {
      setMediaContext(null);
      return;
    }

    switch (mediaContext.type) {
      case 'gallery':
        setGallery((previous) => [...previous, ...selections]);
        break;
      case 'thumbnail':
        setThumbnail(selections[0]);
        break;
      case 'pdf':
        setPdfSpecification(selections[0]);
        break;
      case 'metaImage':
        setMetaImage(selections[0]);
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
              media: [...variant.media, ...selections]
            }
          };
        });
        break;
      default:
        break;
    }

    notify({
      type: 'success',
      message: 'Media item attached to the product.'
    });

    setMediaContext(null);
  };

  const isLoading =
    brandsQuery.isLoading || categoriesQuery.isLoading || taxRatesQuery.isLoading || attributesQuery.isLoading;

  const inputClassNames = (hasError: boolean) =>
    `mt-1 w-full rounded-lg border px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 ${
      hasError
        ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-200'
        : 'border-slate-300 focus:border-primary focus:ring-primary/20'
    }`;

  const renderList = () => {
    const formatDate = (value: string) =>
      new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }).format(new Date(value));

    const formatPrice = (value: number | null | undefined) => {
      if (value == null) {
        return '—';
      }
      try {
        return formatCurrency(value, baseCurrency);
      } catch (error) {
        return value.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });
      }
    };

    if (productsQuery.isError) {
      return (
        <PageSection>
          <div className="space-y-4 text-sm text-slate-600">
            <p>We couldn’t load the products directory right now. Please try again in a moment.</p>
            <button
              type="button"
              onClick={() => productsQuery.refetch()}
              className="inline-flex items-center rounded-full border border-primary px-4 py-2 font-medium text-primary transition hover:bg-primary/10"
            >
              Retry loading products
            </button>
          </div>
        </PageSection>
      );
    }

    return (
      <PageSection padded={false} bodyClassName="flex flex-col">
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
              <input
                type="search"
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder="Search products"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:max-w-sm"
              />
            </div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {totalElements.toLocaleString()} item{totalElements === 1 ? '' : 's'}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Product</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Brand</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">SKU</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Unit price</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Variants</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Updated</th>
                {(canUpdate || canDelete) && (
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {productsQuery.isLoading ? (
                <tr>
                  <td colSpan={canUpdate || canDelete ? 7 : 6} className="px-4 py-6 text-center text-sm text-slate-500">
                    Loading products…
                  </td>
                </tr>
              ) : products.length > 0 ? (
                products.map((product) => (
                  <tr key={product.id} className="transition hover:bg-blue-50/40">
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900">{product.name}</span>
                        <span className="text-xs text-slate-500">
                          {product.unit || '—'} · {product.featured ? 'Featured' : 'Standard'}
                          {product.todaysDeal ? ' · Today’s deal' : ''}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{product.brandName ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{product.sku || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{formatPrice(product.unitPrice)}</td>
                    <td className="px-4 py-3 text-slate-600">{product.variantCount}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(product.updatedAt)}</td>
                    {(canUpdate || canDelete) && (
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {canUpdate && (
                            <button
                              type="button"
                              onClick={() => openEditForm(product.id)}
                              className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-slate-300 hover:text-slate-800"
                              aria-label={`Edit ${product.name}`}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                                <path d="M15.414 2.586a2 2 0 0 0-2.828 0L3 12.172V17h4.828l9.586-9.586a2 2 0 0 0 0-2.828l-2-2Zm-2.121 1.415 2 2L13 8.293l-2-2 2.293-2.292ZM5 13.414 11.293 7.12l1.586 1.586L6.586 15H5v-1.586Z" />
                              </svg>
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDelete(product)}
                              className="rounded-full border border-rose-200 p-2 text-rose-500 transition hover:border-rose-300 hover:text-rose-600"
                              aria-label={`Delete ${product.name}`}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={1.5}
                                className="h-4 w-4"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 11v6" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14 11v6" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 7V4h6v3m2 0v12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V7h12Z" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={canUpdate || canDelete ? 7 : 6} className="px-4 py-6 text-center text-sm text-slate-500">
                    No products found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <PaginationControls
          page={page}
          pageSize={pageSize}
          totalElements={totalElements}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(0);
          }}
          isLoading={productsQuery.isLoading}
        />
      </PageSection>
    );
  };
  const renderForm = () => {
    const isCreateMode = panelMode === 'create';
    const isEditMode = panelMode === 'edit';
    const isSaving = createMutation.isPending || updateMutation.isPending;
    const canSubmit = isCreateMode ? canCreate : canUpdate;
    const submitLabel = isCreateMode ? 'Create product' : 'Update product';

    if (isEditMode && productDetailQuery.isLoading && !editInitializedRef.current) {
      return (
        <PageSection title="Loading product details">
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <span className="inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-primary" />
            Loading product details…
          </div>
        </PageSection>
      );
    }

    if (isEditMode && productDetailQuery.isError && !productDetailQuery.data) {
      return (
        <PageSection title="Unable to load product">
          <div className="space-y-3 text-sm text-slate-600">
            <p>We couldn’t load this product right now. Please try again.</p>
            <button
              type="button"
              onClick={() => productDetailQuery.refetch()}
              className="inline-flex items-center justify-center rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/10"
            >
              Retry
            </button>
          </div>
        </PageSection>
      );
    }

    return (
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-0 lg:grid-cols-[240px_minmax(0,1fr)]">
            <nav className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50 p-4 sm:p-6 lg:border-b-0 lg:border-r">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                    activeTab === tab.id
                      ? 'bg-primary text-white shadow-sm shadow-primary/30'
                      : 'bg-white text-slate-600 hover:bg-primary/10 hover:text-primary'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            <div className="space-y-6 px-4 py-6 sm:px-6">
              {activeTab === 'basic' && (
                <PageSection
                  title="Basic information"
                  description="Capture the core catalog attributes, merchandising units, and customer-facing messaging."
                >
                  <div className="grid gap-8 lg:grid-cols-2">
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label htmlFor="product-name" className="text-sm font-medium text-slate-700">
                          Product name
                        </label>
                        <input
                          id="product-name"
                          type="text"
                          value={form.name}
                          onChange={(event) => setForm((previous) => ({ ...previous, name: event.target.value }))}
                          className={inputClassNames(Boolean(visibleValidation.name))}
                          placeholder="Aurora Running Shoe"
                          required
                          aria-invalid={Boolean(visibleValidation.name)}
                        />
                        {visibleValidation.name && <p className="text-xs text-rose-500">{visibleValidation.name}</p>}
                      </div>

                      <div ref={brandDropdownRef} className="relative space-y-2">
                        <span className="text-sm font-medium text-slate-700">Brand</span>
                        <button
                          type="button"
                          onClick={() => setBrandDropdownOpen((open) => !open)}
                          className={`flex w-full items-center justify-between rounded-lg border bg-white px-3 py-2 text-left text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 ${
                            visibleValidation.brandId
                              ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-200'
                              : 'border-slate-300 focus:border-primary focus:ring-primary/20'
                          }`}
                          aria-expanded={brandDropdownOpen}
                          aria-haspopup="listbox"
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
                        {visibleValidation.brandId && (
                          <p className="text-xs text-rose-500">{visibleValidation.brandId}</p>
                        )}
                        {brandDropdownOpen && (
                          <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                            <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 20 20"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                className="h-4 w-4 text-slate-400"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M19 19l-4.35-4.35m1.35-3.65a5 5 0 1 1-10 0 5 5 0 0 1 10 0Z"
                                />
                              </svg>
                              <input
                                ref={brandSearchInputRef}
                                type="search"
                                value={brandSearch}
                                onChange={(event) => setBrandSearch(event.target.value)}
                                placeholder="Search brands"
                                className="w-full border-none bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
                              />
                              {brandSearch && (
                                <button
                                  type="button"
                                  onClick={() => setBrandSearch('')}
                                  className="text-xs font-medium text-slate-400 transition hover:text-slate-600"
                                >
                                  Clear
                                </button>
                              )}
                            </div>
                            <div className="max-h-64 overflow-y-auto py-1">
                              {brandsQuery.isLoading ? (
                                <div className="px-4 py-3 text-sm text-slate-500">Loading brands…</div>
                              ) : !(brandsQuery.data ?? []).length ? (
                                <div className="px-4 py-3 text-sm text-slate-500">No brands available yet.</div>
                              ) : filteredBrands.length ? (
                                filteredBrands.map((brand) => (
                                  <button
                                    key={brand.id}
                                    type="button"
                                    onClick={() => {
                                      setForm((previous) => ({ ...previous, brandId: String(brand.id) }));
                                      setBrandDropdownOpen(false);
                                      setBrandSearch('');
                                    }}
                                    className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition hover:bg-slate-50 ${
                                      form.brandId === String(brand.id) ? 'bg-primary/5 text-primary' : 'text-slate-700'
                                    }`}
                                    role="option"
                                    aria-selected={form.brandId === String(brand.id)}
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
                                ))
                              ) : (
                                <div className="px-4 py-3 text-sm text-slate-500">No brands match your search.</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Unit</label>
                        {unitMode === 'preset' ? (
                          <select
                            value={
                              unitOptions.includes(form.unit as (typeof unitOptions)[number]) ? form.unit : ''
                            }
                            onChange={(event) => {
                              const value = event.target.value;
                              if (value === CUSTOM_UNIT_OPTION) {
                                setUnitMode('custom');
                                setForm((previous) => ({ ...previous, unit: '' }));
                                return;
                              }
                              setForm((previous) => ({ ...previous, unit: value }));
                            }}
                            className={inputClassNames(Boolean(visibleValidation.unit))}
                            aria-invalid={Boolean(visibleValidation.unit)}
                          >
                            <option value="">Select a unit</option>
                            {unitOptions.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                            <option value={CUSTOM_UNIT_OPTION}>Other (custom)</option>
                          </select>
                        ) : (
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                            <div className="flex-1">
                              <input
                                type="text"
                                value={form.unit}
                                onChange={(event) =>
                                  setForm((previous) => ({ ...previous, unit: event.target.value }))
                                }
                                className={inputClassNames(Boolean(visibleValidation.unit))}
                                placeholder="Enter unit label"
                                aria-invalid={Boolean(visibleValidation.unit)}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setUnitMode('preset');
                                setForm((previous) => ({
                                  ...previous,
                                  unit: unitOptions.includes(previous.unit as (typeof unitOptions)[number])
                                    ? previous.unit
                                    : ''
                                }));
                              }}
                              className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                            >
                              Use presets
                            </button>
                          </div>
                        )}
                        {visibleValidation.unit && (
                          <p className="text-xs text-rose-500">{visibleValidation.unit}</p>
                        )}
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <label htmlFor="product-weight" className="text-sm font-medium text-slate-700">
                            Weight (kg)
                          </label>
                          <input
                            id="product-weight"
                            type="number"
                            min="0"
                            step="0.01"
                            value={form.weightKg}
                            onChange={(event) =>
                              setForm((previous) => ({ ...previous, weightKg: event.target.value }))
                            }
                            placeholder="0.45"
                            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                          <p className="text-xs text-slate-500">Optional — helps calculate shipping estimates.</p>
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="product-min-quantity" className="text-sm font-medium text-slate-700">
                            Minimum purchase quantity
                          </label>
                          <input
                            id="product-min-quantity"
                            type="number"
                            min="1"
                            step="1"
                            value={form.minPurchaseQuantity}
                            onChange={(event) =>
                              setForm((previous) => ({
                                ...previous,
                                minPurchaseQuantity: event.target.value
                              }))
                            }
                            placeholder="1"
                            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                          <p className="text-xs text-slate-500">
                            Leave blank to allow purchases of any quantity.
                          </p>
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4">
                        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                          Merchandising flags
                        </span>
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                          <div>
                            <span className="text-sm font-medium text-slate-700">Featured</span>
                            <div className="mt-2 flex items-center gap-4 text-sm text-slate-600">
                              <label className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name="featured"
                                  value="yes"
                                  checked={form.featured === 'yes'}
                                  onChange={(event) =>
                                    setForm((previous) => ({
                                      ...previous,
                                      featured: event.target.value as 'yes' | 'no'
                                    }))
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
                                    setForm((previous) => ({
                                      ...previous,
                                      featured: event.target.value as 'yes' | 'no'
                                    }))
                                  }
                                  className="h-4 w-4 border-slate-300 text-primary focus:ring-primary"
                                />
                                No
                              </label>
                            </div>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-slate-700">Today’s deal</span>
                            <div className="mt-2 flex items-center gap-4 text-sm text-slate-600">
                              <label className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name="todaysDeal"
                                  value="yes"
                                  checked={form.todaysDeal === 'yes'}
                                  onChange={(event) =>
                                    setForm((previous) => ({
                                      ...previous,
                                      todaysDeal: event.target.value as 'yes' | 'no'
                                    }))
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
                                    setForm((previous) => ({
                                      ...previous,
                                      todaysDeal: event.target.value as 'yes' | 'no'
                                    }))
                                  }
                                  className="h-4 w-4 border-slate-300 text-primary focus:ring-primary"
                                />
                                No
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-2">
                        <span className="text-sm font-medium text-slate-700">Categories</span>
                        <p className="text-xs text-slate-500">
                          Select where the product appears in the catalog hierarchy. Expand parent categories to reveal
                          children.
                        </p>
                        <div
                          className={`mt-2 max-h-64 space-y-3 overflow-y-auto rounded-xl border bg-white p-4 ${
                            visibleValidation.categories ? 'border-rose-500' : 'border-slate-200'
                          }`}
                        >
                          {categoriesQuery.isLoading ? (
                            <p className="text-sm text-slate-500">Loading categories…</p>
                          ) : !categoryTree.length ? (
                            <p className="text-sm text-slate-500">No categories available yet.</p>
                          ) : (
                            renderCategoryNodes(categoryTree)
                          )}
                        </div>
                        {visibleValidation.categories && (
                          <p className="text-xs text-rose-500">{visibleValidation.categories}</p>
                        )}
                        {selectedCategoryIds.length > 0 && (
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            Selected:
                            {selectedCategoryIds.map((categoryId) => {
                              const category = categoriesById.get(categoryId);
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

                      <div ref={taxDropdownRef} className="relative space-y-2">
                        <span className="text-sm font-medium text-slate-700">Applicable taxes</span>
                        <p className="text-xs text-slate-500">
                          Attach one or multiple tax profiles for accurate checkout calculations.
                        </p>
                        <button
                          type="button"
                          onClick={() => setTaxDropdownOpen((open) => !open)}
                          className="flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-900 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary/20"
                          aria-expanded={taxDropdownOpen}
                          aria-haspopup="listbox"
                        >
                          {selectedTaxes.length ? (
                            <span className="flex flex-wrap items-center gap-2">
                              {selectedTaxes.slice(0, 3).map((tax) => (
                                <span
                                  key={tax.id}
                                  className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary"
                                >
                                  {tax.name}
                                </span>
                              ))}
                              {selectedTaxes.length > 3 && (
                                <span className="text-xs text-slate-500">+{selectedTaxes.length - 3} more</span>
                              )}
                            </span>
                          ) : (
                            <span className="text-slate-400">Select taxes</span>
                          )}
                          <span className="text-slate-400">▾</span>
                        </button>
                        {taxDropdownOpen && (
                          <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                            {taxRatesQuery.isLoading ? (
                              <div className="px-4 py-3 text-sm text-slate-500">Loading taxes…</div>
                            ) : !(taxRatesQuery.data ?? []).length ? (
                              <div className="px-4 py-3 text-sm text-slate-500">No tax rates configured yet.</div>
                            ) : (
                              <div className="max-h-64 overflow-y-auto py-1">
                                {(taxRatesQuery.data ?? []).map((tax) => (
                                  <label
                                    key={tax.id}
                                    className="flex items-center justify-between gap-3 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                                  >
                                    <span>
                                      <span className="font-medium">{tax.name}</span>
                                      <span className="ml-2 text-xs text-slate-500">
                                        {tax.rateType === 'PERCENTAGE'
                                          ? `${tax.rateValue}%`
                                          : `Flat ${tax.rateValue}`}
                                      </span>
                                    </span>
                                    <input
                                      type="checkbox"
                                      className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                                      checked={selectedTaxIds.includes(tax.id)}
                                      onChange={() => toggleTaxSelection(tax.id)}
                                    />
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="lg:col-span-2 space-y-6">
                      <div className="space-y-2">
                        <label htmlFor="product-short-description" className="text-sm font-medium text-slate-700">
                          Short description <span className="text-xs font-normal text-slate-400">(optional)</span>
                        </label>
                        <textarea
                          id="product-short-description"
                          value={form.shortDescription}
                          onChange={(event) =>
                            setForm((previous) => ({ ...previous, shortDescription: event.target.value }))
                          }
                          placeholder="Summarize the product in a couple of sentences for quick merchandising callouts."
                          className="min-h-[90px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                        <p className="text-xs text-slate-500">
                          Appears near the buy box and in marketing snippets. Aim for 1–2 punchy sentences.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Description</label>
                        <RichTextEditor
                          value={form.description}
                          onChange={(value) => setForm((previous) => ({ ...previous, description: value }))}
                          minHeight={220}
                        />
                        {visibleValidation.description && (
                          <p className="text-xs text-rose-500">{visibleValidation.description}</p>
                        )}
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-sm font-medium text-slate-700">Expandable info sections</span>
                            <p className="text-xs text-slate-500">
                              Create accordion-style content blocks for specifications, care instructions, or FAQs.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={addInfoSection}
                            className="inline-flex items-center justify-center rounded-full border border-primary/60 px-4 py-1.5 text-sm font-semibold text-primary transition hover:border-primary hover:bg-primary/10"
                          >
                            Add section
                          </button>
                        </div>

                        {form.infoSections.length ? (
                          <div className="space-y-3">
                            {form.infoSections.map((section, index) => (
                              <div key={section.id} className="rounded-xl border border-slate-200 shadow-sm">
                                <button
                                  type="button"
                                  onClick={() => toggleInfoSection(section.id)}
                                  className="flex w-full items-center justify-between gap-3 rounded-t-xl bg-slate-50 px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-100"
                                >
                                  <span>
                                    {section.title.trim() || `Section ${index + 1}`}
                                    {section.title.trim() ? null : (
                                      <span className="ml-2 text-xs font-normal text-slate-400">(Untitled)</span>
                                    )}
                                  </span>
                                  <span className="text-slate-400">{section.expanded ? '▴' : '▾'}</span>
                                </button>
                                {section.expanded && (
                                  <div className="space-y-4 border-t border-slate-200 px-4 py-4">
                                    <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
                                      <div className="space-y-2">
                                        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                                          Section title
                                        </label>
                                        <input
                                          type="text"
                                          value={section.title}
                                          onChange={(event) =>
                                            updateInfoSection(section.id, { title: event.target.value })
                                          }
                                          placeholder="e.g. Material & care"
                                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        />
                                      </div>
                                      <div className="flex flex-wrap gap-2 sm:justify-end">
                                        <button
                                          type="button"
                                          onClick={() => moveInfoSection(section.id, 'up')}
                                          className="inline-flex items-center justify-center rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                                          disabled={index === 0}
                                        >
                                          Move up
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => moveInfoSection(section.id, 'down')}
                                          className="inline-flex items-center justify-center rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                                          disabled={index === form.infoSections.length - 1}
                                        >
                                          Move down
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => removeInfoSection(section.id)}
                                          className="inline-flex items-center justify-center rounded-full border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-50"
                                        >
                                          Remove
                                        </button>
                                      </div>
                                    </div>

                                    <div className="space-y-2">
                                      <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                                        Body content
                                      </label>
                                      <RichTextEditor
                                        value={section.content}
                                        onChange={(value) => updateInfoSection(section.id, { content: value })}
                                        minHeight={180}
                                      />
                                    </div>

                                    <div className="space-y-2">
                                      <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                                        Bullet points <span className="font-normal lowercase text-slate-400">(optional)</span>
                                      </label>
                                      <textarea
                                        value={section.bulletsText}
                                        onChange={(event) =>
                                          updateInfoSection(section.id, { bulletsText: event.target.value })
                                        }
                                        placeholder="Add each point on a new line"
                                        className="min-h-[80px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
                            No expandable sections yet. Use “Add section” to create feature highlights or FAQs.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </PageSection>
              )}
            {activeTab === 'media' && (
              <PageSection
                title="Media"
                description="Manage gallery imagery, hero thumbnails, product videos, and supporting specification documents."
              >
                <div className="grid gap-8 lg:grid-cols-2">
                  <div className="space-y-6">
                    <div className="rounded-xl border border-slate-200 p-4 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <span className="text-sm font-medium text-slate-700">Gallery images</span>
                          <p className="text-xs text-slate-500">
                            Showcase multiple angles or lifestyle imagery. Upload as many visuals as you need.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => openMediaDialog({ type: 'gallery' })}
                          className="inline-flex items-center justify-center rounded-full border border-primary/40 px-4 py-2 text-sm font-semibold text-primary transition hover:border-primary hover:bg-primary/10"
                        >
                          Add images
                        </button>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
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

                    <div className="rounded-xl border border-slate-200 p-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700">Product video</span>
                        <span className="text-xs text-slate-400">Optional</span>
                      </div>
                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
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

                  <div className="space-y-6">
                    <div className="rounded-xl border border-slate-200 p-4 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <span className="text-sm font-medium text-slate-700">Thumbnail image</span>
                          <p className="text-xs text-slate-500">Primary image shown in product listings and highlights.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => openMediaDialog({ type: 'thumbnail' })}
                          className="inline-flex items-center justify-center rounded-full border border-primary/40 px-4 py-2 text-sm font-semibold text-primary transition hover:border-primary hover:bg-primary/10"
                        >
                          {thumbnail ? 'Replace' : 'Select thumbnail'}
                        </button>
                      </div>
                      <div className="mt-4 h-44 overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50">
                        {thumbnail ? (
                          <img src={thumbnail.url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-sm text-slate-500">No thumbnail selected yet.</div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-4 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <span className="text-sm font-medium text-slate-700">PDF specification</span>
                          <p className="text-xs text-slate-500">Attach specification sheets, size charts, or care guides.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => openMediaDialog({ type: 'pdf' })}
                          className="inline-flex items-center justify-center rounded-full border border-primary/40 px-4 py-2 text-sm font-semibold text-primary transition hover:border-primary hover:bg-primary/10"
                        >
                          {pdfSpecification ? 'Replace document' : 'Attach PDF'}
                        </button>
                      </div>
                      {pdfSpecification ? (
                        <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                          <span className="truncate pr-4">{pdfSpecification.originalFilename ?? 'Specification.pdf'}</span>
                          <button
                            type="button"
                            onClick={() => setPdfSpecification(null)}
                            className="text-primary transition hover:text-primary/70"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div className="mt-4 rounded-xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
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
                title="Price & Stock"
                description="Configure pricing, inventory, and attribute-driven variants. Base pricing powers quick calculations for every variant."
              >
                <div className="grid gap-8 xl:grid-cols-[320px_minmax(0,1fr)]">
                  <aside className="space-y-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 shadow-sm">
                      <h3 className="text-sm font-semibold text-slate-800">Attribute options</h3>
                      <p className="mt-1 text-xs text-slate-500">
                        Enable the attributes that should generate product variants. Select values for each attribute.
                      </p>
                    </div>
                    <div className="space-y-4">
                      {(attributesQuery.data ?? []).map((attribute) => {
                        const selection = selectedAttributes.find((entry) => entry.attributeId === attribute.id);
                        const enabled = Boolean(selection);
                        return (
                          <div key={attribute.id} className="rounded-xl border border-slate-200 p-4 shadow-sm">
                            <div className="flex items-start justify-between gap-3">
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
                  </aside>

                  <div className="space-y-6">
                    <div className="rounded-xl border border-slate-200 p-4 shadow-sm">
                      <h3 className="text-sm font-semibold text-slate-800">Base pricing</h3>
                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
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
                            className={inputClassNames(Boolean(visibleValidation.unitPrice))}
                            aria-invalid={Boolean(visibleValidation.unitPrice)}
                          />
                          {visibleValidation.unitPrice && (
                            <p className="mt-1 text-xs text-rose-500">{visibleValidation.unitPrice}</p>
                          )}
                        </div>
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
                        <div>
                          <label htmlFor="discount-start" className="text-sm font-medium text-slate-700">
                            Discount start (optional)
                          </label>
                          <input
                            id="discount-start"
                            type="datetime-local"
                            value={form.discountStartAt}
                            onChange={(event) =>
                              setForm((previous) => ({ ...previous, discountStartAt: event.target.value }))
                            }
                            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                        <div>
                          <label htmlFor="discount-end" className="text-sm font-medium text-slate-700">
                            Discount end (optional)
                          </label>
                          <input
                            id="discount-end"
                            type="datetime-local"
                            value={form.discountEndAt}
                            onChange={(event) =>
                              setForm((previous) => ({ ...previous, discountEndAt: event.target.value }))
                            }
                            className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                              visibleValidation.discountWindow ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-200' : 'border-slate-300 focus:border-primary'
                            }`}
                          />
                          {visibleValidation.discountWindow && (
                            <p className="mt-1 text-xs text-rose-500">{visibleValidation.discountWindow}</p>
                          )}
                        </div>
                        <div className="sm:col-span-2">
                          <label htmlFor="product-tags" className="text-sm font-medium text-slate-700">
                            Tags
                          </label>
                          <p className="mt-1 text-xs text-slate-500">Add merchandising or campaign labels to help merchandising and reporting.</p>
                          <div className="mt-2">
                            <TagsInput
                              id="product-tags"
                              value={form.tags}
                              onChange={(tags) => setForm((previous) => ({ ...previous, tags }))}
                              placeholder="Type a tag and press Enter"
                              maxTags={25}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-4 shadow-sm">
                      <h3 className="text-sm font-semibold text-slate-800">Inventory & visibility</h3>
                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
                        <div>
                          <label htmlFor="sku" className="text-sm font-medium text-slate-700">
                            SKU
                          </label>
                          <input
                            id="sku"
                            type="text"
                            value={form.sku}
                            readOnly
                            placeholder="Auto-generated after save"
                            className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 shadow-inner focus:outline-none"
                          />
                          <p className="mt-1 text-xs text-slate-500">SKUs are generated automatically from brand, category, and product details.</p>
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
                        <div className="sm:col-span-2 space-y-3 rounded-xl border border-slate-200 px-4 py-4">
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

                    <div className="rounded-xl border border-slate-200 p-4 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold text-slate-800">Variants</h3>
                        <span className="text-xs text-slate-500">
                          {variantCombinations.length} combination{variantCombinations.length === 1 ? '' : 's'} active
                        </span>
                      </div>
                      {variantCombinations.length > 0 ? (
                        <div className="mt-4 overflow-x-auto">
                          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                            <thead className="bg-slate-50">
                              <tr>
                                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Variant</th>
                                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Price adj.</th>
                                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">SKU</th>
                                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Quantity</th>
                                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Photos</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {variantCombinations.map((combination) => {
                                const key = combination.map((part) => part.valueId).join('-');
                                const variant = variants[key];
                                const priceAdjustment = variant?.priceAdjustment ?? '';
                                const sku = variant?.sku ?? '';
                                const quantity = variant?.quantity ?? '';
                                const media = variant?.media ?? [];
                                return (
                                  <tr key={key} className="bg-white">
                                    <td className="px-4 py-3 align-top text-slate-700">
                                      <div className="font-medium text-slate-900">{formatVariantLabel(combination)}</div>
                                      <div className="text-xs text-slate-500">
                                        Final price calculated from base + adjustment.
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 align-top">
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={priceAdjustment}
                                        onChange={(event) => handleVariantFieldChange(key, 'priceAdjustment', event.target.value)}
                                        placeholder="0"
                                        className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                      />
                                    </td>
                                    <td className="px-4 py-3 align-top">
                                      <input
                                        type="text"
                                        value={sku}
                                        onChange={(event) => handleVariantFieldChange(key, 'sku', event.target.value)}
                                        placeholder="Variant SKU"
                                        className="w-36 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                      />
                                    </td>
                                    <td className="px-4 py-3 align-top">
                                      <input
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={quantity}
                                        onChange={(event) => handleVariantFieldChange(key, 'quantity', event.target.value)}
                                        placeholder="0"
                                        className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                      />
                                    </td>
                                    <td className="px-4 py-3 align-top">
                                      <div className="flex flex-wrap items-center gap-2">
                                        {media.map((item, index) => (
                                          <div
                                            key={`${item.url}-${index}`}
                                            className="group relative h-12 w-12 overflow-hidden rounded-lg border border-slate-200"
                                          >
                                            <img src={item.url} alt="" className="h-full w-full object-cover" />
                                            <button
                                              type="button"
                                              onClick={() => removeVariantMedia(key, index)}
                                              className="absolute -right-2 -top-2 hidden h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-semibold text-white shadow-sm transition hover:bg-rose-600 group-hover:flex"
                                              aria-label="Remove variant photo"
                                            >
                                              ×
                                            </button>
                                          </div>
                                        ))}
                                        <button
                                          type="button"
                                          onClick={() => openMediaDialog({ type: 'variant', key })}
                                          className="inline-flex items-center justify-center rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-primary hover:text-primary"
                                        >
                                          {media.length ? 'Update photos' : 'Add photos'}
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="mt-4 rounded-xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
                          Select attribute values to generate variant combinations.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </PageSection>
            )}
            {activeTab === 'seo' && (
              <PageSection
                title="SEO"
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
                        Meta keywords (optional)
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
                description="Cross-sell complementary items and categories to raise average order value."
              >
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="space-y-5">
                    <div>
                      <label className="text-sm font-medium text-slate-700" htmlFor="frequently-bought-selector">
                        Add specific products
                      </label>
                      <p className="mt-1 text-xs text-slate-500">
                        Browse or search the catalog, then select multiple items to surface together on the PDP.
                      </p>
                      <div className="relative mt-2" ref={frequentlyBoughtDropdownRef}>
                        <button
                          type="button"
                          id="frequently-bought-selector"
                          onClick={() => {
                            if (!frequentlyBoughtDropdownOpen) {
                              void frequentlyBoughtSuggestionsQuery.refetch();
                            }
                            setFrequentlyBoughtDropdownOpen((previous) => !previous);
                          }}
                          aria-haspopup="listbox"
                          aria-expanded={frequentlyBoughtDropdownOpen}
                          className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        >
                          <span className="truncate text-slate-600">
                            {frequentlyBoughtProducts.length
                              ? `${frequentlyBoughtProducts.length} product${
                                  frequentlyBoughtProducts.length === 1 ? '' : 's'
                                } selected`
                              : 'Search or scroll to pick products'}
                          </span>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={1.5}
                            className={`h-4 w-4 text-slate-500 transition-transform ${
                              frequentlyBoughtDropdownOpen ? 'rotate-180' : ''
                            }`}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 8l4 4 4-4" />
                          </svg>
                        </button>
                        {frequentlyBoughtDropdownOpen && (
                          <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                            <div className="border-b border-slate-100 p-3">
                              <label htmlFor="frequently-bought-search" className="sr-only">
                                Search products
                              </label>
                              <div className="relative flex items-center">
                                <input
                                  id="frequently-bought-search"
                                  type="text"
                                  value={frequentlyBoughtSearch}
                                  onChange={(event) => setFrequentlyBoughtSearch(event.target.value)}
                                  placeholder="Search products by name or SKU"
                                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                />
                                {frequentlyBoughtSearch && (
                                  <button
                                    type="button"
                                    onClick={() => setFrequentlyBoughtSearch('')}
                                    className="absolute right-2 rounded-full border border-slate-200 px-2 py-0.5 text-[11px] font-medium uppercase text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                                  >
                                    Clear
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="max-h-80 overflow-y-auto">
                              {frequentlyBoughtSuggestionsQuery.isLoading ? (
                                <div className="px-4 py-3 text-sm text-slate-500">Loading products…</div>
                              ) : frequentlyBoughtSuggestionsQuery.isError ? (
                                <div className="px-4 py-3 text-sm text-rose-500">
                                  Unable to load product suggestions right now. Try again shortly.
                                </div>
                              ) : frequentlyBoughtDropdownOptions.length ? (
                                frequentlyBoughtDropdownOptions.map((product) => {
                                  const checked = frequentlyBoughtSelectedIds.has(product.id);
                                  return (
                                    <label
                                      key={product.id}
                                      className={`flex cursor-pointer items-center gap-3 border-b border-slate-100 px-4 py-3 text-sm transition last:border-b-0 ${
                                        checked ? 'bg-primary/5' : 'hover:bg-slate-50'
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/40"
                                        checked={checked}
                                        onChange={() => handleToggleFrequentlyBoughtProduct(product)}
                                      />
                                      <ImagePreview
                                        src={product.thumbnailUrl ?? undefined}
                                        mimeType={product.thumbnailMimeType ?? null}
                                        alt={`${product.name} thumbnail`}
                                        className="h-12 w-12 overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
                                        aspectClassName=""
                                        mode="contain"
                                        fallback={
                                          <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-slate-500">
                                            {product.name.charAt(0).toUpperCase()}
                                          </div>
                                        }
                                      />
                                      <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-slate-900">{product.name}</p>
                                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-slate-500">
                                          <span>SKU · {product.sku}</span>
                                          {product.unitPrice != null && (
                                            <span>{formatCurrency(product.unitPrice, baseCurrency)}</span>
                                          )}
                                        </div>
                                      </div>
                                      {checked && (
                                        <span className="text-[11px] font-semibold uppercase text-primary">Selected</span>
                                      )}
                                    </label>
                                  );
                                })
                              ) : (
                                <div className="px-4 py-3 text-sm text-slate-500">
                                  {frequentlyBoughtSearchTerm
                                    ? `No products match “${frequentlyBoughtSearchTerm}”.`
                                    : 'No products available yet.'}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-slate-700">Selected products</h4>
                        {frequentlyBoughtProducts.length > 0 && (
                          <span className="text-xs text-slate-500">{frequentlyBoughtProducts.length} selected</span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        These items will appear in the order listed below on the product detail page.
                      </p>
                      {frequentlyBoughtProducts.length ? (
                        <ul className="mt-3 space-y-3">
                          {frequentlyBoughtProducts.map((product) => (
                            <li
                              key={product.id}
                              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm"
                            >
                              <div className="flex items-center gap-3">
                                <ImagePreview
                                  src={product.thumbnailUrl ?? undefined}
                                  mimeType={product.thumbnailMimeType ?? null}
                                  alt={`${product.name} thumbnail`}
                                  className="h-12 w-12 overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
                                  aspectClassName=""
                                  mode="contain"
                                  fallback={
                                    <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-slate-500">
                                      {product.name.charAt(0).toUpperCase()}
                                    </div>
                                  }
                                />
                                <div>
                                  <p className="text-sm font-medium text-slate-900">{product.name}</p>
                                  <p className="text-xs text-slate-500">SKU · {product.sku}</p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveFrequentlyBoughtProduct(product.id)}
                                className="rounded-full border border-slate-200 p-1.5 text-slate-500 transition hover:border-slate-300 hover:text-slate-800"
                                aria-label={`Remove ${product.name} from frequently bought together`}
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 20 20"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth={1.5}
                                  className="h-4 w-4"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l8 8M14 6l-8 8" />
                                </svg>
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="mt-3 rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
                          No products selected yet. Use the search above to add complementary items.
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-5">
                    <div>
                      <label className="text-sm font-medium text-slate-700" htmlFor="frequently-bought-category-search">
                        Include entire categories
                      </label>
                      <p className="mt-1 text-xs text-slate-500">
                        Automatically surface products from these categories alongside this item.
                      </p>
                      <div className="mt-2 space-y-2">
                        <input
                          id="frequently-bought-category-search"
                          type="text"
                          value={frequentlyBoughtCategorySearch}
                          onChange={(event) => setFrequentlyBoughtCategorySearch(event.target.value)}
                          placeholder="Search categories"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                        <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-inner">
                          {categoriesQuery.isLoading ? (
                            <div className="px-4 py-3 text-sm text-slate-500">Loading categories…</div>
                          ) : filteredFrequentlyBoughtCategories.length ? (
                            filteredFrequentlyBoughtCategories.map((option) => {
                              const checked = frequentlyBoughtCategoryIds.includes(option.id);
                              return (
                                <label
                                  key={option.id}
                                  className={`flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-2 text-sm transition last:border-b-0 ${
                                    checked ? 'bg-primary/5' : 'hover:bg-slate-50'
                                  }`}
                                >
                                  <span className="flex items-center gap-2 text-slate-600">
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => handleToggleFrequentlyBoughtCategory(option.id)}
                                      className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/40"
                                    />
                                    {option.label}
                                  </span>
                                  {checked && <span className="text-[11px] font-semibold uppercase text-primary">Selected</span>}
                                </label>
                              );
                            })
                          ) : (
                            <div className="px-4 py-3 text-sm text-slate-500">
                              {frequentlyBoughtCategorySearch.trim()
                                ? `No categories match “${frequentlyBoughtCategorySearch.trim()}”.`
                                : 'No categories available.'}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {selectedFrequentlyBoughtCategories.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-slate-700">Selected categories</h4>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {selectedFrequentlyBoughtCategories.map((category) => (
                            <span
                              key={category.id}
                              className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary"
                            >
                              {category.label}
                              <button
                                type="button"
                                onClick={() => handleToggleFrequentlyBoughtCategory(category.id)}
                                className="text-primary/70 transition hover:text-primary"
                                aria-label={`Remove ${category.label}`}
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 20 20"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth={1.5}
                                  className="h-3.5 w-3.5"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l8 8M14 6l-8 8" />
                                </svg>
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </PageSection>
            )}

            {activeTab === 'reviews' && (
              <div className="space-y-6">
                <PageSection
                  title="Review snapshot"
                  description="Understand overall sentiment and score distribution for this product."
                >
                  <div className="grid gap-6 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
                    <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Average rating</p>
                        <div className="mt-3 flex items-baseline gap-3">
                          <span className="text-4xl font-semibold text-slate-900">
                            {reviewSummary.total ? reviewSummary.average.toFixed(1) : '—'}
                          </span>
                          {reviewSummary.total > 0 && (
                            <StarRating
                              value={reviewSummary.average}
                              min={0}
                              allowHalf
                              readOnly
                              size="lg"
                              ariaLabel="Average product rating"
                            />
                          )}
                        </div>
                      </div>
                      <p className="mt-6 text-sm text-slate-600">
                        {reviewSummary.total.toLocaleString()} review{reviewSummary.total === 1 ? '' : 's'} recorded
                      </p>
                    </div>
                    <div className="space-y-3">
                      {reviewSummary.breakdown.map((item) => {
                        const percentage = reviewSummary.total
                          ? Math.round((item.count / reviewSummary.total) * 100)
                          : 0;
                        return (
                          <div key={item.score} className="flex items-center gap-3">
                            <div className="flex w-16 items-center justify-between text-sm font-medium text-slate-600">
                              <span>{item.score}</span>
                              <span className="text-amber-400">★</span>
                            </div>
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                              <div
                                className="h-full bg-amber-400 transition-all"
                                style={{ width: `${percentage}%` }}
                                aria-hidden="true"
                              />
                            </div>
                            <div className="w-16 text-right text-xs text-slate-500">
                              {item.count.toLocaleString()} ({percentage}%)
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </PageSection>

                <PageSection
                  title="Customer stories"
                  description="Review individual submissions, including attachments captured at the time of feedback."
                >
                  {productReviews.length ? (
                    <div className="space-y-4">
                      {productReviews.map((review) => {
                        const displayName =
                          review.reviewerName?.trim() ||
                          review.customerName?.trim() ||
                          'Anonymous shopper';
                        const reviewedOn = new Date(review.reviewedAt).toLocaleDateString();
                        const visibilityUpdating =
                          reviewVisibilityUpdatingId === review.id && toggleReviewVisibilityMutation.isPending;
                        const disableVisibilityControls = !canUpdateReviews || visibilityUpdating;
                        return (
                          <article
                            key={review.id}
                            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                          >
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                              <div className="flex items-start gap-3">
                                {review.reviewerAvatar?.url ? (
                                  <ImagePreview
                                    src={review.reviewerAvatar.url}
                                    mimeType={review.reviewerAvatar.mimeType ?? null}
                                    alt={`${displayName} avatar`}
                                    className="h-12 w-12 overflow-hidden rounded-full border border-slate-200 bg-slate-100"
                                    aspectClassName=""
                                  />
                                ) : (
                                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-600">
                                    {displayName.charAt(0).toUpperCase()}
                                  </span>
                                )}
                                <div>
                                  <p className="text-sm font-semibold text-slate-900">{displayName}</p>
                                  {review.customerName && (
                                    <p className="text-xs text-slate-500">
                                      Customer: {review.customerName}
                                      {review.customerId ? ` · #${review.customerId}` : ''}
                                    </p>
                                  )}
                                  <p className="mt-1 text-xs text-slate-400">Reviewed on {reviewedOn}</p>
                                </div>
                              </div>
                              <div className="flex flex-col items-start gap-3 sm:items-end">
                                <div className="flex items-center gap-2 text-sm font-semibold text-amber-500">
                                  <StarRating
                                    value={review.rating}
                                    min={0}
                                    readOnly
                                    size="md"
                                    ariaLabel={`Rating ${review.rating.toFixed(1)} out of 5`}
                                  />
                                  <span className="text-slate-600">{review.rating.toFixed(1)}</span>
                                </div>
                                <fieldset
                                  className="flex flex-wrap items-center gap-4"
                                  aria-label="Review visibility"
                                >
                                  <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                                    <input
                                      type="radio"
                                      name={`product-review-${review.id}-visibility`}
                                      value="visible"
                                      checked={review.published}
                                      onChange={() => handleProductReviewVisibilityChange(review, true)}
                                      disabled={disableVisibilityControls}
                                      className="h-4 w-4 border-slate-300 text-primary focus:ring-primary/40 disabled:cursor-not-allowed"
                                    />
                                    <span>Visible</span>
                                  </label>
                                  <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                                    <input
                                      type="radio"
                                      name={`product-review-${review.id}-visibility`}
                                      value="hidden"
                                      checked={!review.published}
                                      onChange={() => handleProductReviewVisibilityChange(review, false)}
                                      disabled={disableVisibilityControls}
                                      className="h-4 w-4 border-slate-300 text-primary focus:ring-primary/40 disabled:cursor-not-allowed"
                                    />
                                    <span>Hidden</span>
                                  </label>
                                </fieldset>
                                {visibilityUpdating && (
                                  <p className="text-xs text-slate-400">Updating…</p>
                                )}
                              </div>
                            </div>

                            <div className="mt-4 space-y-4 text-sm text-slate-700">
                              <div className="text-xs uppercase tracking-wide text-slate-400">
                                Product · {review.productName}
                              </div>
                              {review.comment ? (
                                <p className="whitespace-pre-line leading-relaxed">{review.comment}</p>
                              ) : (
                                <p className="italic text-slate-500">No written comment provided.</p>
                              )}
                              {review.productCategories.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {review.productCategories.map((category) => (
                                    <span
                                      key={category.id}
                                      className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600"
                                    >
                                      {category.name}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {review.media.length > 0 && (
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                  {review.media.map((asset, index) =>
                                    isVideoAsset(asset) ? (
                                      <video
                                        key={`${review.id}-video-${index}`}
                                        controls
                                        src={asset.url}
                                        className="h-44 w-full rounded-xl border border-slate-200 object-cover shadow-sm"
                                      />
                                    ) : (
                                      <ImagePreview
                                        key={`${review.id}-media-${index}`}
                                        src={asset.url}
                                        mimeType={asset.mimeType ?? null}
                                        alt="Review media"
                                        className="h-44 w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm"
                                        aspectClassName=""
                                      />
                                    )
                                  )}
                                </div>
                              )}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-10 text-center text-sm text-slate-500">
                      No reviews have been submitted for this product yet.
                    </div>
                  )}
                </PageSection>
              </div>
            )}
          </div>
        </div>
        </div>
        <div className="flex flex-col items-stretch gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="space-y-1 text-sm text-slate-500">
            {isLoading && <div>We are loading catalog data to help with product configuration…</div>}
            {showValidation && validationMessages.length > 0 && (
              <div className="text-amber-600">Complete the highlighted fields before saving.</div>
            )}
            {!canSubmit && (
              <div className="text-rose-500">
                You do not have permission to {isCreateMode ? 'create' : 'update'} products. Contact an administrator to request
                access.
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={handleResetClick}
              className="inline-flex items-center justify-center rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="inline-flex items-center justify-center rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-500 transition hover:border-slate-300 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit || isSaving}
              className={`inline-flex items-center justify-center rounded-full px-6 py-2 text-sm font-semibold text-white shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary/30 ${
                !canSubmit || isSaving ? 'bg-slate-400' : 'bg-primary hover:bg-primary/90'
              }`}
            >
              {isSaving ? 'Saving…' : submitLabel}
            </button>
          </div>
        </div>
      </form>
    );
  };

  const headerActions =
    panelMode === 'list'
      ? canCreate
        ? (
            <button
              type="button"
              onClick={openCreateForm}
              className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
            >
              Add product
            </button>
          )
        : null
      : (
          <button
            type="button"
            onClick={handleCancel}
            className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
          >
            Back to products
          </button>
        );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description="Create and configure catalog products, manage media, and prepare rich merchandising data before publishing."
        actions={headerActions}
      />

      {panelMode === 'list' ? renderList() : renderForm()}

      <MediaLibraryDialog
        open={mediaContext !== null}
        onClose={closeMediaDialog}
        onSelect={handleMediaSelect}
        onUpload={mediaContext ? handleMediaUpload : undefined}
        onUploadComplete={handleMediaUploadComplete}
        moduleFilters={mediaContext ? MEDIA_MODULE_FILTERS[mediaContext.type] : undefined}
      />
    </div>
  );
};

export default ProductsPage;
