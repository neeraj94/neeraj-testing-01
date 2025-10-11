package com.example.rbac.finance.taxrate.service;

import com.example.rbac.activity.service.ActivityRecorder;
import com.example.rbac.common.exception.ApiException;
import com.example.rbac.common.pagination.PageResponse;
import com.example.rbac.finance.taxrate.dto.TaxRateDto;
import com.example.rbac.finance.taxrate.dto.TaxRateRequest;
import com.example.rbac.finance.taxrate.mapper.TaxRateMapper;
import com.example.rbac.finance.taxrate.model.TaxRate;
import com.example.rbac.finance.taxrate.model.TaxRateType;
import com.example.rbac.finance.taxrate.repository.TaxRateRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashMap;
import java.util.Map;

@Service
public class TaxRateService {

    private static final BigDecimal MAX_PERCENTAGE = new BigDecimal("100");

    private final TaxRateRepository taxRateRepository;
    private final TaxRateMapper taxRateMapper;
    private final ActivityRecorder activityRecorder;

    public TaxRateService(TaxRateRepository taxRateRepository,
                          TaxRateMapper taxRateMapper,
                          ActivityRecorder activityRecorder) {
        this.taxRateRepository = taxRateRepository;
        this.taxRateMapper = taxRateMapper;
        this.activityRecorder = activityRecorder;
    }

    public PageResponse<TaxRateDto> list(int page, int size, String search) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(size, 1), Sort.by(Sort.Direction.ASC, "name"));
        Page<TaxRate> result;
        if (StringUtils.hasText(search)) {
            result = taxRateRepository.findByNameContainingIgnoreCase(search.trim(), pageable);
        } else {
            result = taxRateRepository.findAll(pageable);
        }
        return PageResponse.from(result.map(this::mapToDto));
    }

    public TaxRateDto get(Long id) {
        TaxRate taxRate = taxRateRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Tax rate not found"));
        return mapToDto(taxRate);
    }

    @Transactional
    public TaxRateDto create(TaxRateRequest request) {
        TaxRate taxRate = new TaxRate();
        applyRequest(taxRate, request);
        ensureUniqueName(taxRate.getName(), null);
        TaxRate saved = taxRateRepository.save(taxRate);
        activityRecorder.record("Finance", "TAX_RATE_CREATED", "Created tax rate " + saved.getName(), "SUCCESS", buildContext(saved));
        return mapToDto(saved);
    }

    @Transactional
    public TaxRateDto update(Long id, TaxRateRequest request) {
        TaxRate taxRate = taxRateRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Tax rate not found"));
        applyRequest(taxRate, request);
        ensureUniqueName(taxRate.getName(), taxRate.getId());
        TaxRate saved = taxRateRepository.save(taxRate);
        activityRecorder.record("Finance", "TAX_RATE_UPDATED", "Updated tax rate " + saved.getName(), "SUCCESS", buildContext(saved));
        return mapToDto(saved);
    }

    @Transactional
    public void delete(Long id) {
        TaxRate taxRate = taxRateRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Tax rate not found"));
        taxRateRepository.delete(taxRate);
        activityRecorder.record("Finance", "TAX_RATE_DELETED", "Deleted tax rate " + taxRate.getName(), "SUCCESS", buildContext(taxRate));
    }

    private void applyRequest(TaxRate taxRate, TaxRateRequest request) {
        String name = request.getName() != null ? request.getName().trim() : null;
        if (!StringUtils.hasText(name)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Tax name is required");
        }
        taxRate.setName(name);
        taxRate.setRateType(request.getRateType());
        taxRate.setRateValue(normalizeRateValue(request.getRateType(), request.getRateValue()));
        taxRate.setDescription(trimToNull(request.getDescription()));
    }

    private void ensureUniqueName(String name, Long taxRateId) {
        if (!StringUtils.hasText(name)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Tax name is required");
        }
        boolean exists = taxRateId == null
                ? taxRateRepository.existsByNameIgnoreCase(name)
                : taxRateRepository.existsByNameIgnoreCaseAndIdNot(name, taxRateId);
        if (exists) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "A tax rate with this name already exists");
        }
    }

    private BigDecimal normalizeRateValue(TaxRateType rateType, BigDecimal value) {
        if (value == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Tax rate value is required");
        }
        BigDecimal sanitized = value.setScale(4, RoundingMode.HALF_UP);
        if (sanitized.compareTo(BigDecimal.ZERO) < 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Tax rate value must be zero or greater");
        }
        if (rateType == TaxRateType.PERCENTAGE && sanitized.compareTo(MAX_PERCENTAGE) > 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Percentage tax rates cannot exceed 100%");
        }
        return sanitized;
    }

    private String trimToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private TaxRateDto mapToDto(TaxRate taxRate) {
        TaxRateDto dto = taxRateMapper.toDto(taxRate);
        if (dto.getRateValue() != null) {
            dto.setRateValue(dto.getRateValue().setScale(4, RoundingMode.HALF_UP));
        }
        return dto;
    }

    private Map<String, Object> buildContext(TaxRate taxRate) {
        Map<String, Object> context = new HashMap<>();
        context.put("taxRateId", taxRate.getId());
        context.put("taxRateName", taxRate.getName());
        context.put("rateType", taxRate.getRateType() != null ? taxRate.getRateType().name() : null);
        context.put("rateValue", taxRate.getRateValue());
        return context;
    }
}
