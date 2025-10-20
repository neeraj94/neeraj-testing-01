package com.example.rbac.admin.attributes.service;

import com.example.rbac.admin.activity.service.ActivityRecorder;
import com.example.rbac.admin.attributes.dto.AttributeDto;
import com.example.rbac.admin.attributes.dto.AttributeRequest;
import com.example.rbac.admin.attributes.mapper.AttributeMapper;
import com.example.rbac.admin.attributes.model.Attribute;
import com.example.rbac.admin.attributes.model.AttributeValue;
import com.example.rbac.admin.attributes.repository.AttributeRepository;
import com.example.rbac.common.exception.ApiException;
import com.example.rbac.common.pagination.PageResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class AttributeService {

    private final AttributeRepository attributeRepository;
    private final AttributeMapper attributeMapper;
    private final ActivityRecorder activityRecorder;

    public AttributeService(AttributeRepository attributeRepository,
                            AttributeMapper attributeMapper,
                            ActivityRecorder activityRecorder) {
        this.attributeRepository = attributeRepository;
        this.attributeMapper = attributeMapper;
        this.activityRecorder = activityRecorder;
    }

    @Transactional(readOnly = true)
    public PageResponse<AttributeDto> list(int page, int size, String search) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(size, 1), Sort.by(Sort.Direction.ASC, "name"));
        Page<Attribute> result;
        if (StringUtils.hasText(search)) {
            String term = search.trim();
            result = attributeRepository.findByNameContainingIgnoreCaseOrSlugContainingIgnoreCase(term, term, pageable);
        } else {
            result = attributeRepository.findAll(pageable);
        }
        return PageResponse.from(result.map(attributeMapper::toDto));
    }

    @Transactional(readOnly = true)
    public AttributeDto get(Long id) {
        Attribute attribute = attributeRepository.findWithValuesById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Attribute not found"));
        return attributeMapper.toDto(attribute);
    }

    @Transactional
    public AttributeDto create(AttributeRequest request) {
        Attribute attribute = new Attribute();
        applyRequest(attribute, request);
        ensureUniqueSlug(attribute.getSlug(), null);
        Attribute saved = attributeRepository.save(attribute);
        activityRecorder.record("Catalog", "ATTRIBUTE_CREATED", "Created attribute " + saved.getName(), "SUCCESS", buildContext(saved));
        return attributeMapper.toDto(saved);
    }

    @Transactional
    public AttributeDto update(Long id, AttributeRequest request) {
        Attribute attribute = attributeRepository.findWithValuesById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Attribute not found"));
        String previousSlug = attribute.getSlug();
        applyRequest(attribute, request);
        ensureUniqueSlug(attribute.getSlug(), attribute.getId());
        Attribute saved = attributeRepository.save(attribute);
        activityRecorder.record("Catalog", "ATTRIBUTE_UPDATED", "Updated attribute " + saved.getName(), "SUCCESS", buildContext(saved));
        if (previousSlug != null && !previousSlug.equalsIgnoreCase(saved.getSlug())) {
            activityRecorder.record("Catalog", "ATTRIBUTE_SLUG_CHANGED", "Attribute slug updated", "SUCCESS",
                    Map.of("attributeId", saved.getId(), "previousSlug", previousSlug, "newSlug", saved.getSlug()));
        }
        return attributeMapper.toDto(saved);
    }

    @Transactional
    public void delete(Long id) {
        Attribute attribute = attributeRepository.findWithValuesById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Attribute not found"));
        attributeRepository.delete(attribute);
        activityRecorder.record("Catalog", "ATTRIBUTE_DELETED", "Deleted attribute " + attribute.getName(), "SUCCESS", buildContext(attribute));
    }

    private void applyRequest(Attribute attribute, AttributeRequest request) {
        attribute.setName(request.getName().trim());
        attribute.setSlug(normalizeSlug(request.getSlug(), request.getName()));

        List<String> requestedValues = Optional.ofNullable(request.getValues()).orElse(List.of());
        LinkedHashSet<String> sanitizedValues = requestedValues.stream()
                .map(value -> value == null ? null : value.trim())
                .filter(StringUtils::hasText)
                .map(value -> value.length() > 200 ? value.substring(0, 200) : value)
                .collect(Collectors.toCollection(LinkedHashSet::new));

        if (sanitizedValues.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Add at least one attribute value");
        }

        attribute.getValues().clear();
        int sortOrder = 0;
        for (String value : sanitizedValues) {
            AttributeValue attributeValue = new AttributeValue();
            attributeValue.setAttribute(attribute);
            attributeValue.setValue(value);
            attributeValue.setSortOrder(sortOrder++);
            attribute.getValues().add(attributeValue);
        }
    }

    private void ensureUniqueSlug(String slug, Long attributeId) {
        if (!StringUtils.hasText(slug)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Attribute slug is required");
        }
        boolean exists = attributeId == null
                ? attributeRepository.existsBySlugIgnoreCase(slug)
                : attributeRepository.existsBySlugIgnoreCaseAndIdNot(slug, attributeId);
        if (exists) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Attribute slug already exists");
        }
    }

    private String normalizeSlug(String slug, String fallback) {
        String candidate = Optional.ofNullable(slug)
                .filter(StringUtils::hasText)
                .map(String::trim)
                .orElseGet(() -> Optional.ofNullable(fallback).map(String::trim).orElse(null));
        if (!StringUtils.hasText(candidate)) {
            candidate = "attribute-" + Long.toHexString(System.nanoTime());
        }
        String sanitized = candidate.toLowerCase()
                .replaceAll("[^a-z0-9\\s-_]", "")
                .replaceAll("[\\s-_]+", "-");
        if (!StringUtils.hasText(sanitized)) {
            sanitized = "attribute-" + Long.toHexString(System.nanoTime());
        }
        return sanitized.length() > 160 ? sanitized.substring(0, 160) : sanitized;
    }

    private Map<String, Object> buildContext(Attribute attribute) {
        return Map.of(
                "attributeId", attribute.getId(),
                "attributeName", attribute.getName(),
                "attributeSlug", attribute.getSlug()
        );
    }
}
