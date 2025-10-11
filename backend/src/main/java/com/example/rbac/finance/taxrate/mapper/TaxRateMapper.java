package com.example.rbac.finance.taxrate.mapper;

import com.example.rbac.finance.taxrate.dto.TaxRateDto;
import com.example.rbac.finance.taxrate.model.TaxRate;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface TaxRateMapper {

    TaxRateDto toDto(TaxRate taxRate);
}
