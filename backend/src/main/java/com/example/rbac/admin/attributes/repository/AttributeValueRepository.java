package com.example.rbac.admin.attributes.repository;

import com.example.rbac.admin.attributes.model.AttributeValue;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AttributeValueRepository extends JpaRepository<AttributeValue, Long> {
}
