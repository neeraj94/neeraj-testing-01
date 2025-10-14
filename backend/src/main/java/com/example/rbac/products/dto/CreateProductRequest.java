package com.example.rbac.products.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class CreateProductRequest {

    @NotBlank(message = "Product name is required")
    @Size(max = 200, message = "Product name must be at most 200 characters")
    private String name;

    private Long brandId;

    @NotBlank(message = "Unit is required")
    @Size(max = 100, message = "Unit must be at most 100 characters")
    private String unit;

    private BigDecimal weightKg;

    private Integer minPurchaseQuantity;

    private boolean featured;

    private boolean todaysDeal;

    @Size(max = 500, message = "Short description must be at most 500 characters")
    private String shortDescription;

    private String description;

    @Size(max = 50, message = "Video provider must be at most 50 characters")
    private String videoProvider;

    @Size(max = 500, message = "Video URL must be at most 500 characters")
    private String videoUrl;

    @Valid
    private List<MediaSelectionRequest> gallery = new ArrayList<>();

    @Valid
    private MediaSelectionRequest thumbnail;

    @Valid
    private MediaSelectionRequest pdfSpecification;

    @Valid
    private ProductSeoRequest seo;

    @Valid
    private ProductPricingRequest pricing;

    @NotEmpty(message = "Select at least one category")
    private List<Long> categoryIds = new ArrayList<>();

    private List<Long> taxRateIds = new ArrayList<>();

    @Valid
    private List<SelectedAttributeRequest> attributes = new ArrayList<>();

    @Valid
    private List<ProductVariantRequest> variants = new ArrayList<>();

    @Valid
    private List<ProductExpandableSectionRequest> expandableSections = new ArrayList<>();

    @Valid
    private List<ProductInfoSectionRequest> infoSections = new ArrayList<>();

    private List<Long> frequentlyBoughtProductIds = new ArrayList<>();

    private List<Long> frequentlyBoughtCategoryIds = new ArrayList<>();

    public void setFrequentlyBought(FrequentlyBoughtSelection frequentlyBought) {
        if (frequentlyBought == null) {
            this.frequentlyBoughtProductIds = new ArrayList<>();
            this.frequentlyBoughtCategoryIds = new ArrayList<>();
            return;
        }
        if (frequentlyBought.getProductIds() != null) {
            this.frequentlyBoughtProductIds = new ArrayList<>(frequentlyBought.getProductIds());
        }
        if (frequentlyBought.getCategoryIds() != null) {
            this.frequentlyBoughtCategoryIds = new ArrayList<>(frequentlyBought.getCategoryIds());
        }
    }

    public static class FrequentlyBoughtSelection {

        private List<Long> productIds = new ArrayList<>();

        private List<Long> categoryIds = new ArrayList<>();

        public List<Long> getProductIds() {
            return productIds;
        }

        public void setProductIds(List<Long> productIds) {
            this.productIds = productIds;
        }

        public List<Long> getCategoryIds() {
            return categoryIds;
        }

        public void setCategoryIds(List<Long> categoryIds) {
            this.categoryIds = categoryIds;
        }
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Long getBrandId() {
        return brandId;
    }

    public void setBrandId(Long brandId) {
        this.brandId = brandId;
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

    public String getShortDescription() {
        return shortDescription;
    }

    public void setShortDescription(String shortDescription) {
        this.shortDescription = shortDescription;
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

    public List<MediaSelectionRequest> getGallery() {
        return gallery;
    }

    public void setGallery(List<MediaSelectionRequest> gallery) {
        this.gallery = gallery;
    }

    public MediaSelectionRequest getThumbnail() {
        return thumbnail;
    }

    public void setThumbnail(MediaSelectionRequest thumbnail) {
        this.thumbnail = thumbnail;
    }

    public MediaSelectionRequest getPdfSpecification() {
        return pdfSpecification;
    }

    public void setPdfSpecification(MediaSelectionRequest pdfSpecification) {
        this.pdfSpecification = pdfSpecification;
    }

    public ProductSeoRequest getSeo() {
        return seo;
    }

    public void setSeo(ProductSeoRequest seo) {
        this.seo = seo;
    }

    public ProductPricingRequest getPricing() {
        return pricing;
    }

    public void setPricing(ProductPricingRequest pricing) {
        this.pricing = pricing;
    }

    public List<Long> getCategoryIds() {
        return categoryIds;
    }

    public void setCategoryIds(List<Long> categoryIds) {
        this.categoryIds = categoryIds;
    }

    public List<Long> getTaxRateIds() {
        return taxRateIds;
    }

    public void setTaxRateIds(List<Long> taxRateIds) {
        this.taxRateIds = taxRateIds;
    }

    public List<SelectedAttributeRequest> getAttributes() {
        return attributes;
    }

    public void setAttributes(List<SelectedAttributeRequest> attributes) {
        this.attributes = attributes;
    }

    public List<ProductVariantRequest> getVariants() {
        return variants;
    }

    public void setVariants(List<ProductVariantRequest> variants) {
        this.variants = variants;
    }

    public List<ProductExpandableSectionRequest> getExpandableSections() {
        return expandableSections;
    }

    public void setExpandableSections(List<ProductExpandableSectionRequest> expandableSections) {
        this.expandableSections = expandableSections;
    }

    public List<ProductInfoSectionRequest> getInfoSections() {
        return infoSections;
    }

    public void setInfoSections(List<ProductInfoSectionRequest> infoSections) {
        this.infoSections = infoSections;
    }

    public List<Long> getFrequentlyBoughtProductIds() {
        return frequentlyBoughtProductIds;
    }

    public void setFrequentlyBoughtProductIds(List<Long> frequentlyBoughtProductIds) {
        this.frequentlyBoughtProductIds = frequentlyBoughtProductIds;
    }

    public List<Long> getFrequentlyBoughtCategoryIds() {
        return frequentlyBoughtCategoryIds;
    }

    public void setFrequentlyBoughtCategoryIds(List<Long> frequentlyBoughtCategoryIds) {
        this.frequentlyBoughtCategoryIds = frequentlyBoughtCategoryIds;
    }
}
