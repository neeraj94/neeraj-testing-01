package com.example.rbac.uploadedfile.spec;

import com.example.rbac.uploadedfile.model.UploadedFile;
import com.example.rbac.uploadedfile.model.UploadedFileModule;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;

public class UploadedFileSpecifications {

    private UploadedFileSpecifications() {
    }

    public static Specification<UploadedFile> filter(
            Set<UploadedFileModule> modules,
            String featureName,
            String fileType,
            Long uploadedById,
            Instant from,
            Instant to,
            String search
    ) {
        return (root, query, builder) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (!CollectionUtils.isEmpty(modules)) {
                predicates.add(root.get("module").in(modules));
            }

            if (StringUtils.hasText(featureName)) {
                predicates.add(builder.equal(builder.lower(root.get("featureName")), featureName.toLowerCase(Locale.ROOT)));
            }

            if (StringUtils.hasText(fileType)) {
                predicates.add(builder.equal(builder.lower(root.get("fileType")), fileType.toLowerCase(Locale.ROOT)));
            }

            if (uploadedById != null) {
                predicates.add(builder.equal(root.get("uploadedById"), uploadedById));
            }

            if (from != null) {
                predicates.add(builder.greaterThanOrEqualTo(root.get("uploadedAt"), from));
            }

            if (to != null) {
                predicates.add(builder.lessThanOrEqualTo(root.get("uploadedAt"), to));
            }

            if (StringUtils.hasText(search)) {
                String likePattern = "%" + search.toLowerCase(Locale.ROOT) + "%";
                Predicate filenamePredicate = builder.like(builder.lower(root.get("originalFilename")), likePattern);
                Predicate publicUrlPredicate = builder.like(builder.lower(root.get("publicUrl")), likePattern);
                predicates.add(builder.or(filenamePredicate, publicUrlPredicate));
            }

            return builder.and(predicates.toArray(new Predicate[0]));
        };
    }
}
