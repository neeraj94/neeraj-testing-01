package com.example.rbac.products.dto.storefront;

import com.example.rbac.products.dto.MediaAssetDto;

import java.util.List;

public class PublicProductDetailDto {

    private Long id;
    private String name;
    private String slug;
    private String brandName;
    private String shortDescription;
    private String description;
    private MediaAssetDto primaryImage;
    private List<MediaAssetDto> gallery;
    private PublicProductPricingDto pricing;
    private PublicProductStockDto stock;
    private Integer minPurchaseQuantity;
    private Integer maxPurchaseQuantity;
    private String sku;
    private List<String> categoryNames;
    private List<PublicProductOfferDto> offers;
    private List<PublicProductVariantAttributeDto> variantAttributes;
    private List<PublicProductVariantDto> variants;
    private List<PublicProductSectionDto> expandableSections;
    private List<PublicProductSectionDto> infoSections;
    private PublicProductReviewSummaryDto reviewSummary;
    private List<PublicProductReviewDto> reviews;
    private List<PublicProductRecommendationDto> frequentlyBought;
    private List<PublicProductRecommendationDto> recentlyViewed;

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

    public String getSlug() {
        return slug;
    }

    public void setSlug(String slug) {
        this.slug = slug;
    }

    public String getBrandName() {
        return brandName;
    }

    public void setBrandName(String brandName) {
        this.brandName = brandName;
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

    public MediaAssetDto getPrimaryImage() {
        return primaryImage;
    }

    public void setPrimaryImage(MediaAssetDto primaryImage) {
        this.primaryImage = primaryImage;
    }

    public List<MediaAssetDto> getGallery() {
        return gallery;
    }

    public void setGallery(List<MediaAssetDto> gallery) {
        this.gallery = gallery;
    }

    public PublicProductPricingDto getPricing() {
        return pricing;
    }

    public void setPricing(PublicProductPricingDto pricing) {
        this.pricing = pricing;
    }

    public PublicProductStockDto getStock() {
        return stock;
    }

    public void setStock(PublicProductStockDto stock) {
        this.stock = stock;
    }

    public Integer getMinPurchaseQuantity() {
        return minPurchaseQuantity;
    }

    public void setMinPurchaseQuantity(Integer minPurchaseQuantity) {
        this.minPurchaseQuantity = minPurchaseQuantity;
    }

    public Integer getMaxPurchaseQuantity() {
        return maxPurchaseQuantity;
    }

    public void setMaxPurchaseQuantity(Integer maxPurchaseQuantity) {
        this.maxPurchaseQuantity = maxPurchaseQuantity;
    }

    public String getSku() {
        return sku;
    }

    public void setSku(String sku) {
        this.sku = sku;
    }

    public List<String> getCategoryNames() {
        return categoryNames;
    }

    public void setCategoryNames(List<String> categoryNames) {
        this.categoryNames = categoryNames;
    }

    public List<PublicProductOfferDto> getOffers() {
        return offers;
    }

    public void setOffers(List<PublicProductOfferDto> offers) {
        this.offers = offers;
    }

    public List<PublicProductVariantAttributeDto> getVariantAttributes() {
        return variantAttributes;
    }

    public void setVariantAttributes(List<PublicProductVariantAttributeDto> variantAttributes) {
        this.variantAttributes = variantAttributes;
    }

    public List<PublicProductVariantDto> getVariants() {
        return variants;
    }

    public void setVariants(List<PublicProductVariantDto> variants) {
        this.variants = variants;
    }

    public List<PublicProductSectionDto> getExpandableSections() {
        return expandableSections;
    }

    public void setExpandableSections(List<PublicProductSectionDto> expandableSections) {
        this.expandableSections = expandableSections;
    }

    public List<PublicProductSectionDto> getInfoSections() {
        return infoSections;
    }

    public void setInfoSections(List<PublicProductSectionDto> infoSections) {
        this.infoSections = infoSections;
    }

    public PublicProductReviewSummaryDto getReviewSummary() {
        return reviewSummary;
    }

    public void setReviewSummary(PublicProductReviewSummaryDto reviewSummary) {
        this.reviewSummary = reviewSummary;
    }

    public List<PublicProductReviewDto> getReviews() {
        return reviews;
    }

    public void setReviews(List<PublicProductReviewDto> reviews) {
        this.reviews = reviews;
    }


    public List<PublicProductRecommendationDto> getFrequentlyBought() {
        return frequentlyBought;
    }

    public void setFrequentlyBought(List<PublicProductRecommendationDto> frequentlyBought) {
        this.frequentlyBought = frequentlyBought;
    }

    public List<PublicProductRecommendationDto> getRecentlyViewed() {
        return recentlyViewed;
    }

    public void setRecentlyViewed(List<PublicProductRecommendationDto> recentlyViewed) {
        this.recentlyViewed = recentlyViewed;
    }
}
