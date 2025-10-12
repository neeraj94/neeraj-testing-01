package com.example.rbac.finance.taxrate.mapper;

import com.example.rbac.finance.taxrate.dto.TaxRateDto;
import com.example.rbac.finance.taxrate.model.TaxRate;
import org.springframework.stereotype.Component;

@Component
public class TaxRateMapper {

    public TaxRateDto toDto(TaxRate taxRate) {
        if (taxRate == null) {
            return null;
        }
        TaxRateDto dto = new TaxRateDto();
        dto.setId(taxRate.getId());
        dto.setName(taxRate.getName());
        dto.setRateType(taxRate.getRateType());
        dto.setRateValue(taxRate.getRateValue());
        dto.setDescription(taxRate.getDescription());
        dto.setCreatedAt(taxRate.getCreatedAt());
        dto.setUpdatedAt(taxRate.getUpdatedAt());
        return dto;
    }
}
