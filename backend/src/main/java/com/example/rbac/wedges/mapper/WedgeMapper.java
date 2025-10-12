package com.example.rbac.wedges.mapper;

import com.example.rbac.categories.dto.CategoryOptionDto;
import com.example.rbac.categories.model.Category;
import com.example.rbac.wedges.dto.WedgeDto;
import com.example.rbac.wedges.model.Wedge;
import org.springframework.stereotype.Component;

@Component
public class WedgeMapper {

    public WedgeDto toDto(Wedge wedge) {
        if (wedge == null) {
            return null;
        }
        WedgeDto dto = new WedgeDto();
        dto.setId(wedge.getId());
        dto.setName(wedge.getName());
        dto.setIconUrl(wedge.getIconUrl());
        dto.setShortDescription(wedge.getShortDescription());
        dto.setLongDescription(wedge.getLongDescription());
        dto.setDefaultWedge(wedge.isDefaultWedge());
        dto.setCategory(toCategoryOption(wedge.getCategory()));
        dto.setCreatedAt(wedge.getCreatedAt());
        dto.setUpdatedAt(wedge.getUpdatedAt());
        return dto;
    }

    private CategoryOptionDto toCategoryOption(Category category) {
        if (category == null) {
            return null;
        }
        String type = category.getType() != null ? category.getType().name() : null;
        return new CategoryOptionDto(category.getId(), category.getName(), type);
    }
}
