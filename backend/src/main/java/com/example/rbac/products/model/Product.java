package com.example.rbac.products.model;

import com.example.rbac.attributes.model.AttributeValue;
import com.example.rbac.brands.model.Brand;
import com.example.rbac.categories.model.Category;
import com.example.rbac.finance.taxrate.model.TaxRate;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "products")
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "brand_id")
    private Brand brand;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(length = 100)
    private String unit;

    @Column(name = "weight_kg", precision = 12, scale = 3)
    private BigDecimal weightKg;

    @Column(name = "min_purchase_quantity")
    private Integer minPurchaseQuantity;

    @Column(nullable = false)
    private boolean featured;

    @Column(name = "todays_deal", nullable = false)
    private boolean todaysDeal;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "video_provider", length = 50)
    private String videoProvider;

    @Column(name = "video_url", length = 500)
    private String videoUrl;

    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "url", column = @Column(name = "thumbnail_url", length = 500)),
            @AttributeOverride(name = "storageKey", column = @Column(name = "thumbnail_storage_key", length = 255)),
            @AttributeOverride(name = "originalFilename", column = @Column(name = "thumbnail_original_filename", length = 255)),
            @AttributeOverride(name = "mimeType", column = @Column(name = "thumbnail_mime_type", length = 150)),
            @AttributeOverride(name = "sizeBytes", column = @Column(name = "thumbnail_size_bytes"))
    })
    private MediaAsset thumbnail;

    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "url", column = @Column(name = "pdf_url", length = 500)),
            @AttributeOverride(name = "storageKey", column = @Column(name = "pdf_storage_key", length = 255)),
            @AttributeOverride(name = "originalFilename", column = @Column(name = "pdf_original_filename", length = 255)),
            @AttributeOverride(name = "mimeType", column = @Column(name = "pdf_mime_type", length = 150)),
            @AttributeOverride(name = "sizeBytes", column = @Column(name = "pdf_size_bytes"))
    })
    private MediaAsset pdfSpecification;

    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "url", column = @Column(name = "meta_image_url", length = 500)),
            @AttributeOverride(name = "storageKey", column = @Column(name = "meta_image_storage_key", length = 255)),
            @AttributeOverride(name = "originalFilename", column = @Column(name = "meta_image_original_filename", length = 255)),
            @AttributeOverride(name = "mimeType", column = @Column(name = "meta_image_mime_type", length = 150)),
            @AttributeOverride(name = "sizeBytes", column = @Column(name = "meta_image_size_bytes"))
    })
    private MediaAsset metaImage;

    @Column(name = "meta_title", length = 200)
    private String metaTitle;

    @Column(name = "meta_description", columnDefinition = "TEXT")
    private String metaDescription;

    @Column(name = "meta_keywords", columnDefinition = "TEXT")
    private String metaKeywords;

    @Column(name = "meta_canonical_url", length = 255)
    private String metaCanonicalUrl;

    @Column(name = "price_tag", length = 120)
    private String priceTag;

    @Column(name = "unit_price", precision = 12, scale = 2)
    private BigDecimal unitPrice;

    @Enumerated(EnumType.STRING)
    @Column(name = "discount_type", length = 20)
    private DiscountType discountType;

    @Column(name = "discount_value", precision = 12, scale = 2)
    private BigDecimal discountValue;

    @Column(name = "discount_min_qty")
    private Integer discountMinQuantity;

    @Column(name = "discount_max_qty")
    private Integer discountMaxQuantity;

    @Column(name = "stock_quantity")
    private Integer stockQuantity;

    @Column(length = 160)
    private String sku;

    @Column(name = "external_link", length = 500)
    private String externalLink;

    @Column(name = "external_link_button", length = 120)
    private String externalLinkButton;

    @Column(name = "low_stock_warning")
    private Integer lowStockWarning;

    @Enumerated(EnumType.STRING)
    @Column(name = "stock_visibility", length = 20)
    private StockVisibilityState stockVisibility;

    @ManyToMany
    @JoinTable(name = "product_categories",
            joinColumns = @JoinColumn(name = "product_id"),
            inverseJoinColumns = @JoinColumn(name = "category_id"))
    private Set<Category> categories = new HashSet<>();

    @ManyToMany
    @JoinTable(name = "product_tax_rates",
            joinColumns = @JoinColumn(name = "product_id"),
            inverseJoinColumns = @JoinColumn(name = "tax_rate_id"))
    private Set<TaxRate> taxRates = new HashSet<>();

    @ManyToMany
    @JoinTable(name = "product_attribute_values",
            joinColumns = @JoinColumn(name = "product_id"),
            inverseJoinColumns = @JoinColumn(name = "attribute_value_id"))
    private Set<AttributeValue> attributeValues = new HashSet<>();

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("displayOrder ASC")
    private List<ProductGalleryImage> galleryImages = new ArrayList<>();

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("displayOrder ASC, id ASC")
    private List<ProductVariant> variants = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Brand getBrand() {
        return brand;
    }

    public void setBrand(Brand brand) {
        this.brand = brand;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getUnit() {
        return unit;
    }

    public void setUnit(String unit) {
        this.unit = unit;
    }

    public BigDecimal getWeightKg() {
        return weightKg;
    }

    public void setWeightKg(BigDecimal weightKg) {
        this.weightKg = weightKg;
    }

    public Integer getMinPurchaseQuantity() {
        return minPurchaseQuantity;
    }

    public void setMinPurchaseQuantity(Integer minPurchaseQuantity) {
        this.minPurchaseQuantity = minPurchaseQuantity;
    }

    public boolean isFeatured() {
        return featured;
    }

    public void setFeatured(boolean featured) {
        this.featured = featured;
    }

    public boolean isTodaysDeal() {
        return todaysDeal;
    }

    public void setTodaysDeal(boolean todaysDeal) {
        this.todaysDeal = todaysDeal;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getVideoProvider() {
        return videoProvider;
    }

    public void setVideoProvider(String videoProvider) {
        this.videoProvider = videoProvider;
    }

    public String getVideoUrl() {
        return videoUrl;
    }

    public void setVideoUrl(String videoUrl) {
        this.videoUrl = videoUrl;
    }

    public MediaAsset getThumbnail() {
        return thumbnail;
    }

    public void setThumbnail(MediaAsset thumbnail) {
        this.thumbnail = thumbnail;
    }

    public MediaAsset getPdfSpecification() {
        return pdfSpecification;
    }

    public void setPdfSpecification(MediaAsset pdfSpecification) {
        this.pdfSpecification = pdfSpecification;
    }

    public MediaAsset getMetaImage() {
        return metaImage;
    }

    public void setMetaImage(MediaAsset metaImage) {
        this.metaImage = metaImage;
    }

    public String getMetaTitle() {
        return metaTitle;
    }

    public void setMetaTitle(String metaTitle) {
        this.metaTitle = metaTitle;
    }

    public String getMetaDescription() {
        return metaDescription;
    }

    public void setMetaDescription(String metaDescription) {
        this.metaDescription = metaDescription;
    }

    public String getMetaKeywords() {
        return metaKeywords;
    }

    public void setMetaKeywords(String metaKeywords) {
        this.metaKeywords = metaKeywords;
    }

    public String getMetaCanonicalUrl() {
        return metaCanonicalUrl;
    }

    public void setMetaCanonicalUrl(String metaCanonicalUrl) {
        this.metaCanonicalUrl = metaCanonicalUrl;
    }

    public String getPriceTag() {
        return priceTag;
    }

    public void setPriceTag(String priceTag) {
        this.priceTag = priceTag;
    }

    public BigDecimal getUnitPrice() {
        return unitPrice;
    }

    public void setUnitPrice(BigDecimal unitPrice) {
        this.unitPrice = unitPrice;
    }

    public DiscountType getDiscountType() {
        return discountType;
    }

    public void setDiscountType(DiscountType discountType) {
        this.discountType = discountType;
    }

    public BigDecimal getDiscountValue() {
        return discountValue;
    }

    public void setDiscountValue(BigDecimal discountValue) {
        this.discountValue = discountValue;
    }

    public Integer getDiscountMinQuantity() {
        return discountMinQuantity;
    }

    public void setDiscountMinQuantity(Integer discountMinQuantity) {
        this.discountMinQuantity = discountMinQuantity;
    }

    public Integer getDiscountMaxQuantity() {
        return discountMaxQuantity;
    }

    public void setDiscountMaxQuantity(Integer discountMaxQuantity) {
        this.discountMaxQuantity = discountMaxQuantity;
    }

    public Integer getStockQuantity() {
        return stockQuantity;
    }

    public void setStockQuantity(Integer stockQuantity) {
        this.stockQuantity = stockQuantity;
    }

    public String getSku() {
        return sku;
    }

    public void setSku(String sku) {
        this.sku = sku;
    }

    public String getExternalLink() {
        return externalLink;
    }

    public void setExternalLink(String externalLink) {
        this.externalLink = externalLink;
    }

    public String getExternalLinkButton() {
        return externalLinkButton;
    }

    public void setExternalLinkButton(String externalLinkButton) {
        this.externalLinkButton = externalLinkButton;
    }

    public Integer getLowStockWarning() {
        return lowStockWarning;
    }

    public void setLowStockWarning(Integer lowStockWarning) {
        this.lowStockWarning = lowStockWarning;
    }

    public StockVisibilityState getStockVisibility() {
        return stockVisibility;
    }

    public void setStockVisibility(StockVisibilityState stockVisibility) {
        this.stockVisibility = stockVisibility;
    }

    public Set<Category> getCategories() {
        return categories;
    }

    public void setCategories(Set<Category> categories) {
        this.categories = categories;
    }

    public Set<TaxRate> getTaxRates() {
        return taxRates;
    }

    public void setTaxRates(Set<TaxRate> taxRates) {
        this.taxRates = taxRates;
    }

    public Set<AttributeValue> getAttributeValues() {
        return attributeValues;
    }

    public void setAttributeValues(Set<AttributeValue> attributeValues) {
        this.attributeValues = attributeValues;
    }

    public List<ProductGalleryImage> getGalleryImages() {
        return galleryImages;
    }

    public void setGalleryImages(List<ProductGalleryImage> galleryImages) {
        this.galleryImages = galleryImages;
    }

    public List<ProductVariant> getVariants() {
        return variants;
    }

    public void setVariants(List<ProductVariant> variants) {
        this.variants = variants;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
