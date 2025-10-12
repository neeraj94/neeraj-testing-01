package com.example.rbac.badges.mapper;

import com.example.rbac.badges.dto.BadgeDto;
import com.example.rbac.badges.model.Badge;
import org.springframework.stereotype.Component;

@Component
public class BadgeMapper {

    public BadgeDto toDto(Badge badge) {
        if (badge == null) {
            return null;
        }
        BadgeDto dto = new BadgeDto();
        dto.setId(badge.getId());
        dto.setName(badge.getName());
        dto.setIconUrl(badge.getIconUrl());
        dto.setShortDescription(badge.getShortDescription());
        dto.setLongDescription(badge.getLongDescription());
        dto.setDefaultBadge(badge.isDefaultBadge());
        dto.setCreatedAt(badge.getCreatedAt());
        dto.setUpdatedAt(badge.getUpdatedAt());
        return dto;
    }
}
