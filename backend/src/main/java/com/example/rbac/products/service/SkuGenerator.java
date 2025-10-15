package com.example.rbac.products.service;

import com.example.rbac.categories.model.Category;
import com.example.rbac.products.model.Product;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.text.Normalizer;
import java.time.Instant;
import java.util.Comparator;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

@Component
public class SkuGenerator {

    private static final String PLACEHOLDER_PREFIX = "PENDING-";

    public String generatePlaceholder() {
        String random = UUID.randomUUID().toString().replace("-", "");
        return PLACEHOLDER_PREFIX + random.substring(0, Math.min(10, random.length())).toUpperCase(Locale.ROOT);
    }

    public boolean isPlaceholder(String sku) {
        return sku != null && sku.startsWith(PLACEHOLDER_PREFIX);
    }

    public long initialSequence(Product product) {
        if (product.getId() != null && product.getId() > 0) {
            return product.getId();
        }
        return Math.abs(Instant.now().toEpochMilli());
    }

    public String generate(Product product, long sequence) {
        String brand = prefix(product.getBrand() != null ? product.getBrand().getName() : null);
        String category = prefix(resolveCategoryName(product));
        String name = prefix(product.getName());
        String encoded = encodeSequence(sequence);
        return String.format("%s-%s-%s-%s", brand, category, name, encoded);
    }

    private String resolveCategoryName(Product product) {
        Set<Category> categories = product.getCategories();
        if (categories == null || categories.isEmpty()) {
            return "GENERAL";
        }
        return categories.stream()
                .filter(Objects::nonNull)
                .map(Category::getName)
                .filter(StringUtils::hasText)
                .min(Comparator.comparing(name -> name.toLowerCase(Locale.ROOT)))
                .orElse("GENERAL");
    }

    private String prefix(String source) {
        if (!StringUtils.hasText(source)) {
            return "GEN";
        }
        String normalized = Normalizer.normalize(source, Normalizer.Form.NFD)
                .replaceAll("[^\\p{Alnum}]", "")
                .toUpperCase(Locale.ROOT);
        if (normalized.length() >= 3) {
            return normalized.substring(0, 3);
        }
        return (normalized + "XXX").substring(0, 3);
    }

    private String encodeSequence(long sequence) {
        long positive = sequence <= 0 ? Math.abs(sequence) + 1 : sequence;
        return Long.toString(positive, 36).toUpperCase(Locale.ROOT);
    }
}
