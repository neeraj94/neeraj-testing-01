package com.example.rbac.admin.attributes.mapper;

import com.example.rbac.admin.attributes.dto.AttributeDto;
import com.example.rbac.admin.attributes.dto.AttributeValueDto;
import com.example.rbac.admin.attributes.model.Attribute;
import com.example.rbac.admin.attributes.model.AttributeValue;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class AttributeMapper {

    public AttributeDto toDto(Attribute attribute) {
        AttributeDto dto = new AttributeDto();
        dto.setId(attribute.getId());
        dto.setName(attribute.getName());
        dto.setSlug(attribute.getSlug());
        dto.setCreatedAt(attribute.getCreatedAt());
        dto.setUpdatedAt(attribute.getUpdatedAt());
        dto.setValues(mapValues(attribute.getValues()));
        return dto;
    }

    private List<AttributeValueDto> mapValues(List<AttributeValue> values) {
        return values.stream().map(this::toValueDto).collect(Collectors.toList());
    }

    private AttributeValueDto toValueDto(AttributeValue value) {
        AttributeValueDto dto = new AttributeValueDto();
        dto.setId(value.getId());
        dto.setValue(value.getValue());
        dto.setSortOrder(value.getSortOrder());
        return dto;
    }
}
