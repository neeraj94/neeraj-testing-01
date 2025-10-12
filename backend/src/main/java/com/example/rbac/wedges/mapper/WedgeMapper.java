package com.example.rbac.wedges.mapper;

import com.example.rbac.categories.dto.CategoryOptionDto;
import com.example.rbac.categories.model.Category;
import com.example.rbac.wedges.dto.WedgeDto;
import com.example.rbac.wedges.model.Wedge;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface WedgeMapper {

    @Mapping(target = "category", expression = "java(toCategoryOption(wedge.getCategory()))")
    WedgeDto toDto(Wedge wedge);

    default CategoryOptionDto toCategoryOption(Category category) {
        if (category == null) {
            return null;
        }
        String type = category.getType() != null ? category.getType().name() : null;
        return new CategoryOptionDto(category.getId(), category.getName(), type);
    }
}
