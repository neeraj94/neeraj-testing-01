package com.example.rbac.admin.settings.repository;

import com.example.rbac.admin.settings.model.EmailTemplate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EmailTemplateRepository extends JpaRepository<EmailTemplate, Long> {
    List<EmailTemplate> findAllByOrderByCategoryAscNameAsc();

    Optional<EmailTemplate> findByCodeIgnoreCase(String code);
}
