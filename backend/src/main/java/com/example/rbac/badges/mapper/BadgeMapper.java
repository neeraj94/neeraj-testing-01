package com.example.rbac.badges.mapper;

import com.example.rbac.badges.dto.BadgeDto;
import com.example.rbac.badges.model.Badge;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface BadgeMapper {

    @Mapping(target = "badgeCategory", ignore = true)
    BadgeDto toDto(Badge badge);
}
