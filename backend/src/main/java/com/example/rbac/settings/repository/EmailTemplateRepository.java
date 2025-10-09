package com.example.rbac.settings.repository;

import com.example.rbac.settings.model.EmailTemplate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EmailTemplateRepository extends JpaRepository<EmailTemplate, Long> {
    List<EmailTemplate> findAllByOrderByCategoryAscNameAsc();
}
