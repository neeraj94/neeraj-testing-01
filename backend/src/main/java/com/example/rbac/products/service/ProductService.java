package com.example.rbac.products.service;

import com.example.rbac.attributes.model.AttributeValue;
import com.example.rbac.attributes.repository.AttributeValueRepository;
import com.example.rbac.brands.model.Brand;
import com.example.rbac.brands.repository.BrandRepository;
import com.example.rbac.categories.model.Category;
import com.example.rbac.categories.repository.CategoryRepository;
import com.example.rbac.common.exception.ApiException;
import com.example.rbac.common.pagination.PageResponse;
import com.example.rbac.finance.taxrate.model.TaxRate;
import com.example.rbac.finance.taxrate.repository.TaxRateRepository;
import com.example.rbac.products.dto.*;
import com.example.rbac.products.mapper.ProductMapper;
import com.example.rbac.products.model.*;
import com.example.rbac.products.repository.ProductRepository;
import com.example.rbac.products.repository.ProductReviewRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ProductService {

    private final ProductRepository productRepository;
    private final BrandRepository brandRepository;
    private final CategoryRepository categoryRepository;
    private final TaxRateRepository taxRateRepository;
    private final AttributeValueRepository attributeValueRepository;
    private final ProductMapper productMapper;
    private final ProductReviewRepository productReviewRepository;
    private final SkuGenerator skuGenerator;

    public ProductService(ProductRepository productRepository,
                          BrandRepository brandRepository,
                          CategoryRepository categoryRepository,
                          TaxRateRepository taxRateRepository,
                          AttributeValueRepository attributeValueRepository,
                          ProductMapper productMapper,
                          ProductReviewRepository productReviewRepository,
                          SkuGenerator skuGenerator) {
        this.productRepository = productRepository;
        this.brandRepository = brandRepository;
        this.categoryRepository = categoryRepository;
        this.taxRateRepository = taxRateRepository;
        this.attributeValueRepository = attributeValueRepository;
        this.productMapper = productMapper;
        this.productReviewRepository = productReviewRepository;
        this.skuGenerator = skuGenerator;
    }

    @Transactional(readOnly = true)
    public PageResponse<ProductSummaryDto> list(int page, int size, String search) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(size, 1), Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Product> result;
        if (StringUtils.hasText(search)) {
            String term = search.trim();
            result = productRepository.findByNameContainingIgnoreCase(term, pageable);
        } else {
            result = productRepository.findAll(pageable);
        }
        return PageResponse.from(result.map(productMapper::toSummary));
    }

    @Transactional(readOnly = true)
    public ProductDto get(Long id) {
        Product product = productRepository.findDetailedById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Product not found"));
        return productMapper.toDto(product, productReviewRepository.findByProductIdOrderByReviewedAtDesc(id));
    }

    @Transactional
    public ProductDto create(CreateProductRequest request) {
        Product product = new Product();
        product.setSku(skuGenerator.generatePlaceholder());
        applyRequest(product, request, true);
        Product saved = productRepository.saveAndFlush(product);
        ensureGeneratedSku(saved);
        return productMapper.toDto(saved, List.of());
    }

    @Transactional
    public ProductDto update(Long id, CreateProductRequest request) {
        Product product = productRepository.findDetailedById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Product not found"));
        applyRequest(product, request, false);
        Product saved = productRepository.save(product);
        return productMapper.toDto(saved, productReviewRepository.findByProductIdOrderByReviewedAtDesc(saved.getId()));
    }

    @Transactional
    public void delete(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Product not found"));
        productRepository.delete(product);
    }

    private void applyRequest(Product product, CreateProductRequest request, boolean creating) {
        product.setName(request.getName().trim());
        product.setUnit(request.getUnit().trim());
        product.setWeightKg(request.getWeightKg());
        product.setMinPurchaseQuantity(request.getMinPurchaseQuantity());
        product.setFeatured(request.isFeatured());
        product.setTodaysDeal(request.isTodaysDeal());
        product.setShortDescription(trimToNull(request.getShortDescription()));
        product.setDescription(trimToNull(request.getDescription()));
        product.setVideoProvider(trimToNull(request.getVideoProvider()));
        product.setVideoUrl(trimToNull(request.getVideoUrl()));

        if (request.getBrandId() != null) {
            Brand brand = brandRepository.findById(request.getBrandId())
                    .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Selected brand does not exist"));
            product.setBrand(brand);
        } else {
            product.setBrand(null);
        }

        Set<Long> categoryIds = new LinkedHashSet<>(request.getCategoryIds());
        List<Category> categories = categoryRepository.findAllById(categoryIds);
        if (categories.size() != categoryIds.size()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "One or more selected categories were not found");
        }
        product.getCategories().clear();
        product.getCategories().addAll(categories);

        if (!CollectionUtils.isEmpty(request.getTaxRateIds())) {
            Set<Long> taxIds = new LinkedHashSet<>(request.getTaxRateIds());
            List<TaxRate> taxRates = taxRateRepository.findAllById(taxIds);
            if (taxRates.size() != taxIds.size()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "One or more selected taxes were not found");
            }
            product.getTaxRates().clear();
            product.getTaxRates().addAll(taxRates);
        } else {
            product.getTaxRates().clear();
        }

        ProductPricingRequest pricing = request.getPricing();
        if (pricing == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Pricing details are required");
        }

        if (creating) {
            if (StringUtils.hasText(pricing.getSku())) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "SKU is managed automatically and cannot be specified");
            }
        } else if (StringUtils.hasText(pricing.getSku()) && !pricing.getSku().equals(product.getSku())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "SKU cannot be modified after creation");
        }

        validateDiscountWindow(pricing);

        product.setUnitPrice(pricing.getUnitPrice());
        product.setDiscountType(pricing.getDiscountType());
        product.setDiscountValue(pricing.getDiscountValue());
        product.setDiscountMinQuantity(pricing.getDiscountMinQuantity());
        product.setDiscountMaxQuantity(pricing.getDiscountMaxQuantity());
        product.setDiscountStartAt(pricing.getDiscountStartAt());
        product.setDiscountEndAt(pricing.getDiscountEndAt());
        replaceTags(product, pricing.getTags());
        product.setStockQuantity(pricing.getStockQuantity());
        product.setExternalLink(trimToNull(pricing.getExternalLink()));
        product.setExternalLinkButton(trimToNull(pricing.getExternalLinkButton()));
        product.setLowStockWarning(pricing.getLowStockWarning());
        product.setStockVisibility(pricing.getStockVisibility());

        ProductSeoRequest seo = request.getSeo();
        if (seo != null) {
            product.setMetaTitle(trimToNull(seo.getTitle()));
            product.setMetaDescription(trimToNull(seo.getDescription()));
            product.setMetaKeywords(trimToNull(seo.getKeywords()));
            product.setMetaCanonicalUrl(trimToNull(seo.getCanonicalUrl()));
            product.setMetaImage(toMediaAsset(seo.getImage()));
        } else {
            product.setMetaTitle(null);
            product.setMetaDescription(null);
            product.setMetaKeywords(null);
            product.setMetaCanonicalUrl(null);
            product.setMetaImage(null);
        }

        product.setThumbnail(toMediaAsset(request.getThumbnail()));
        product.setPdfSpecification(toMediaAsset(request.getPdfSpecification()));

        rebuildGallery(product, request.getGallery());
        rebuildExpandableSections(product, request.getExpandableSections());

        Set<Long> attributeValueIds = collectAttributeValueIds(request);
        Map<Long, AttributeValue> attributeValueMap = attributeValueIds.isEmpty()
                ? Collections.emptyMap()
                : attributeValueRepository.findAllById(attributeValueIds).stream()
                .collect(Collectors.toMap(AttributeValue::getId, value -> value));

        validateAttributeSelections(request, attributeValueMap);
        product.getAttributeValues().clear();
        product.getAttributeValues().addAll(resolveSelectedAttributeValues(request, attributeValueMap));

        rebuildVariants(product, request.getVariants(), attributeValueMap);

        rebuildInfoSections(product, request.getInfoSections());
    }

    private void ensureGeneratedSku(Product product) {
        if (!skuGenerator.isPlaceholder(product.getSku())) {
            return;
        }
        long seed = skuGenerator.initialSequence(product);
        for (int attempt = 0; attempt < 20; attempt++) {
            String candidate = skuGenerator.generate(product, seed + attempt);
            if (!productRepository.existsBySku(candidate)) {
                product.setSku(candidate);
                productRepository.saveAndFlush(product);
                return;
            }
        }
        throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Unable to allocate a unique SKU");
    }

    private void validateDiscountWindow(ProductPricingRequest pricing) {
        Instant start = pricing.getDiscountStartAt();
        Instant end = pricing.getDiscountEndAt();
        if (start != null && end != null && end.isBefore(start)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Discount end date must be on or after the start date");
        }
    }

    private void replaceTags(Product product, List<String> tags) {
        List<String> normalized = normalizeTags(tags);
        List<String> target = product.getTags();
        if (target == null) {
            target = new ArrayList<>();
            product.setTags(target);
        } else {
            target.clear();
        }
        target.addAll(normalized);
    }

    private List<String> normalizeTags(List<String> tags) {
        if (CollectionUtils.isEmpty(tags)) {
            return List.of();
        }
        List<String> normalized = new ArrayList<>();
        for (String tag : tags) {
            String value = trimToNull(tag);
            if (value == null) {
                continue;
            }
            if (value.length() > 120) {
                value = value.substring(0, 120);
            }
            String candidate = value;
            boolean exists = normalized.stream().anyMatch(existing -> existing.equalsIgnoreCase(candidate));
            if (!exists) {
                normalized.add(value);
            }
        }
        return normalized;
    }

    private void rebuildGallery(Product product, List<MediaSelectionRequest> gallery) {
        product.getGalleryImages().clear();
        if (CollectionUtils.isEmpty(gallery)) {
            return;
        }
        int index = 0;
        for (MediaSelectionRequest item : gallery) {
            if (item == null) {
                continue;
            }
            MediaAsset mediaAsset = toMediaAsset(item);
            if (mediaAsset == null) {
                continue;
            }
            ProductGalleryImage image = new ProductGalleryImage();
            image.setProduct(product);
            image.setMedia(mediaAsset);
            image.setDisplayOrder(index++);
            product.getGalleryImages().add(image);
        }
    }

    private void rebuildExpandableSections(Product product, List<ProductExpandableSectionRequest> sections) {
        List<ProductExpandableSection> expandableSections = product.getExpandableSections();
        if (expandableSections == null) {
            expandableSections = new ArrayList<>();
            product.setExpandableSections(expandableSections);
        }
        expandableSections.clear();
        if (CollectionUtils.isEmpty(sections)) {
            return;
        }
        for (ProductExpandableSectionRequest sectionRequest : sections) {
            if (sectionRequest == null) {
                continue;
            }
            String title = trimToNull(sectionRequest.getTitle());
            String content = trimToNull(sectionRequest.getContent());
            if (title == null && content == null) {
                continue;
            }
            ProductExpandableSection section = new ProductExpandableSection();
            section.setTitle(title);
            section.setContent(content);
            expandableSections.add(section);
        }
    }

    private Set<Long> collectAttributeValueIds(CreateProductRequest request) {
        Set<Long> ids = new HashSet<>();
        if (!CollectionUtils.isEmpty(request.getAttributes())) {
            request.getAttributes().forEach(attribute -> {
                if (!CollectionUtils.isEmpty(attribute.getValueIds())) {
                    ids.addAll(attribute.getValueIds());
                }
            });
        }
        if (!CollectionUtils.isEmpty(request.getVariants())) {
            request.getVariants().forEach(variant -> {
                if (!CollectionUtils.isEmpty(variant.getAttributeValueIds())) {
                    ids.addAll(variant.getAttributeValueIds());
                }
            });
        }
        return ids;
    }

    private void validateAttributeSelections(CreateProductRequest request, Map<Long, AttributeValue> attributeValueMap) {
        if (CollectionUtils.isEmpty(request.getAttributes())) {
            return;
        }
        for (SelectedAttributeRequest attribute : request.getAttributes()) {
            if (CollectionUtils.isEmpty(attribute.getValueIds())) {
                continue;
            }
            for (Long valueId : attribute.getValueIds()) {
                AttributeValue value = attributeValueMap.get(valueId);
                if (value == null) {
                    throw new ApiException(HttpStatus.BAD_REQUEST, "Unknown attribute value: " + valueId);
                }
                if (value.getAttribute() == null || !Objects.equals(value.getAttribute().getId(), attribute.getAttributeId())) {
                    throw new ApiException(HttpStatus.BAD_REQUEST, "Attribute value " + valueId + " does not belong to the selected attribute");
                }
            }
        }
        if (!CollectionUtils.isEmpty(request.getVariants())) {
            for (ProductVariantRequest variant : request.getVariants()) {
                if (CollectionUtils.isEmpty(variant.getAttributeValueIds())) {
                    continue;
                }
                for (Long valueId : variant.getAttributeValueIds()) {
                    AttributeValue value = attributeValueMap.get(valueId);
                    if (value == null) {
                        throw new ApiException(HttpStatus.BAD_REQUEST, "Unknown attribute value: " + valueId);
                    }
                }
            }
        }
    }

    private Collection<AttributeValue> resolveSelectedAttributeValues(CreateProductRequest request, Map<Long, AttributeValue> attributeValueMap) {
        if (CollectionUtils.isEmpty(request.getAttributes())) {
            return Collections.emptyList();
        }
        return request.getAttributes().stream()
                .filter(attribute -> !CollectionUtils.isEmpty(attribute.getValueIds()))
                .flatMap(attribute -> attribute.getValueIds().stream())
                .map(attributeValueMap::get)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private void rebuildVariants(Product product, List<ProductVariantRequest> variants, Map<Long, AttributeValue> attributeValueMap) {
        product.getVariants().clear();
        if (CollectionUtils.isEmpty(variants)) {
            return;
        }
        int variantIndex = 0;
        for (ProductVariantRequest variantRequest : variants) {
            ProductVariant variant = new ProductVariant();
            variant.setProduct(product);
            variant.setVariantKey(variantRequest.getKey().trim());
            variant.setPriceAdjustment(variantRequest.getPriceAdjustment());
            variant.setSku(trimToNull(variantRequest.getSku()));
            variant.setQuantity(variantRequest.getQuantity());
            variant.setDisplayOrder(variantIndex++);

            List<ProductVariantValue> values = new ArrayList<>();
            if (!CollectionUtils.isEmpty(variantRequest.getAttributeValueIds())) {
                int position = 0;
                for (Long valueId : variantRequest.getAttributeValueIds()) {
                    AttributeValue attributeValue = attributeValueMap.get(valueId);
                    if (attributeValue == null) {
                        throw new ApiException(HttpStatus.BAD_REQUEST, "Unknown attribute value: " + valueId);
                    }
                    ProductVariantValue value = new ProductVariantValue();
                    value.setVariant(variant);
                    value.setAttributeValue(attributeValue);
                    value.setPosition(position++);
                    values.add(value);
                }
            }
            variant.setValues(values);

            List<ProductVariantMedia> mediaItems = new ArrayList<>();
            if (!CollectionUtils.isEmpty(variantRequest.getMedia())) {
                int mediaIndex = 0;
                for (MediaSelectionRequest mediaRequest : variantRequest.getMedia()) {
                    MediaAsset asset = toMediaAsset(mediaRequest);
                    if (asset == null) {
                        continue;
                    }
                    ProductVariantMedia media = new ProductVariantMedia();
                    media.setVariant(variant);
                    media.setMedia(asset);
                    media.setDisplayOrder(mediaIndex++);
                    mediaItems.add(media);
                }
            }
            variant.setMedia(mediaItems);

            product.getVariants().add(variant);
        }
    }

    private void rebuildInfoSections(Product product, List<ProductInfoSectionRequest> sections) {
        product.getInfoSections().clear();
        if (CollectionUtils.isEmpty(sections)) {
            return;
        }
        int order = 0;
        for (ProductInfoSectionRequest sectionRequest : sections) {
            if (sectionRequest == null || !StringUtils.hasText(sectionRequest.getTitle())) {
                continue;
            }
            ProductInfoSection section = new ProductInfoSection();
            section.setProduct(product);
            section.setTitle(sectionRequest.getTitle().trim());
            section.setContent(trimToNull(sectionRequest.getContent()));
            section.setDisplayOrder(order++);

            List<String> bulletPoints = new ArrayList<>();
            if (!CollectionUtils.isEmpty(sectionRequest.getBulletPoints())) {
                for (String bullet : sectionRequest.getBulletPoints()) {
                    if (StringUtils.hasText(bullet)) {
                        bulletPoints.add(bullet.trim());
                    }
                }
            }
            section.setBulletPoints(bulletPoints);
            product.getInfoSections().add(section);
        }
    }

    private MediaAsset toMediaAsset(MediaSelectionRequest request) {
        if (request == null || !StringUtils.hasText(request.getUrl())) {
            return null;
        }
        MediaAsset asset = new MediaAsset();
        asset.setUrl(request.getUrl().trim());
        asset.setStorageKey(trimToNull(request.getStorageKey()));
        asset.setOriginalFilename(trimToNull(request.getOriginalFilename()));
        asset.setMimeType(trimToNull(request.getMimeType()));
        asset.setSizeBytes(request.getSizeBytes());
        return asset;
    }

    private String trimToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
