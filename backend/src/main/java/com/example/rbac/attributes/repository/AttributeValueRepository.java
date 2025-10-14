package com.example.rbac.attributes.repository;

import com.example.rbac.attributes.model.AttributeValue;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AttributeValueRepository extends JpaRepository<AttributeValue, Long> {
}
