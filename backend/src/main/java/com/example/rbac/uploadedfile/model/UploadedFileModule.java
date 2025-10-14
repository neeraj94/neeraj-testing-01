package com.example.rbac.uploadedfile.model;

import java.util.Arrays;
import java.util.Optional;

public enum UploadedFileModule {
    BRAND_LOGO("Brand", "Logo"),
    CATEGORY_ICON("Category", "Icon"),
    CATEGORY_BANNER("Category", "Banner"),
    CATEGORY_COVER("Category", "Cover"),
    BADGE_ICON("Badge", "Icon"),
    BADGE_CATEGORY_ICON("Badge category", "Icon"),
    BLOG_BANNER_IMAGE("Blog", "Banner image"),
    BLOG_META_IMAGE("Blog", "Meta image"),
    WEDGE_ICON("Wedge", "Icon"),
    PRODUCT_GALLERY_IMAGE("Product", "Gallery image"),
    PRODUCT_THUMBNAIL("Product", "Thumbnail"),
    PRODUCT_META_IMAGE("Product", "Meta image"),
    PRODUCT_PDF_SPEC("Product", "Specification"),
    PRODUCT_VARIANT_IMAGE("Product", "Variant image"),
    PRODUCT_MEDIA("Product", "Media asset"),
    USER_PROFILE("User", "Profile photo");

    private final String featureName;
    private final String contextLabel;

    UploadedFileModule(String featureName, String contextLabel) {
        this.featureName = featureName;
        this.contextLabel = contextLabel;
    }

    public String getFeatureName() {
        return featureName;
    }

    public String getContextLabel() {
        return contextLabel;
    }

    public static Optional<UploadedFileModule> fromValue(String value) {
        if (value == null || value.isBlank()) {
            return Optional.empty();
        }
        return Arrays.stream(values())
                .filter(module -> module.name().equalsIgnoreCase(value.trim()))
                .findFirst();
    }
}
