package com.example.rbac.brands.mapper;

import com.example.rbac.brands.dto.BrandDto;
import com.example.rbac.brands.model.Brand;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface BrandMapper {

    BrandDto toDto(Brand brand);
}
