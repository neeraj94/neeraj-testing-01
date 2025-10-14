package com.example.rbac.products.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public class ProductDto {

    private Long id;
    private String name;
    private ProductBrandDto brand;
    private String unit;
    private BigDecimal weightKg;
    private Integer minPurchaseQuantity;
    private boolean featured;
    private boolean todaysDeal;
    private String description;
    private String shortDescription;
    private String videoProvider;
    private String videoUrl;
    private List<MediaAssetDto> gallery;
    private MediaAssetDto thumbnail;
    private MediaAssetDto pdfSpecification;
    private ProductSeoDto seo;
    private List<ProductCategoryDto> categories;
    private List<ProductTaxRateDto> taxRates;
    private List<ProductAttributeDto> attributes;
    private ProductPricingDto pricing;
    private List<ProductVariantDto> variants;
    private List<ProductExpandableSectionDto> expandableSections;
    private List<ProductReviewDto> reviews;
    private Instant createdAt;
    private Instant updatedAt;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public ProductBrandDto getBrand() {
        return brand;
    }

    public void setBrand(ProductBrandDto brand) {
        this.brand = brand;
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

    public String getShortDescription() {
        return shortDescription;
    }

    public void setShortDescription(String shortDescription) {
        this.shortDescription = shortDescription;
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

    public List<MediaAssetDto> getGallery() {
        return gallery;
    }

    public void setGallery(List<MediaAssetDto> gallery) {
        this.gallery = gallery;
    }

    public MediaAssetDto getThumbnail() {
        return thumbnail;
    }

    public void setThumbnail(MediaAssetDto thumbnail) {
        this.thumbnail = thumbnail;
    }

    public MediaAssetDto getPdfSpecification() {
        return pdfSpecification;
    }

    public void setPdfSpecification(MediaAssetDto pdfSpecification) {
        this.pdfSpecification = pdfSpecification;
    }

    public ProductSeoDto getSeo() {
        return seo;
    }

    public void setSeo(ProductSeoDto seo) {
        this.seo = seo;
    }

    public List<ProductCategoryDto> getCategories() {
        return categories;
    }

    public void setCategories(List<ProductCategoryDto> categories) {
        this.categories = categories;
    }

    public List<ProductTaxRateDto> getTaxRates() {
        return taxRates;
    }

    public void setTaxRates(List<ProductTaxRateDto> taxRates) {
        this.taxRates = taxRates;
    }

    public List<ProductAttributeDto> getAttributes() {
        return attributes;
    }

    public void setAttributes(List<ProductAttributeDto> attributes) {
        this.attributes = attributes;
    }

    public ProductPricingDto getPricing() {
        return pricing;
    }

    public void setPricing(ProductPricingDto pricing) {
        this.pricing = pricing;
    }

    public List<ProductVariantDto> getVariants() {
        return variants;
    }

    public void setVariants(List<ProductVariantDto> variants) {
        this.variants = variants;
    }

    public List<ProductExpandableSectionDto> getExpandableSections() {
        return expandableSections;
    }

    public void setExpandableSections(List<ProductExpandableSectionDto> expandableSections) {
        this.expandableSections = expandableSections;
    }

    public List<ProductReviewDto> getReviews() {
        return reviews;
    }

    public void setReviews(List<ProductReviewDto> reviews) {
        this.reviews = reviews;
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
