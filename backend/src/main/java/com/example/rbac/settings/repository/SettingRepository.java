package com.example.rbac.settings.repository;

import com.example.rbac.settings.model.Setting;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SettingRepository extends JpaRepository<Setting, Long> {
    Optional<Setting> findByCode(String code);

    List<Setting> findAllByOrderByCategoryOrderAscSectionOrderAscFieldOrderAsc();

    List<Setting> findByCodeIn(List<String> codes);
}
