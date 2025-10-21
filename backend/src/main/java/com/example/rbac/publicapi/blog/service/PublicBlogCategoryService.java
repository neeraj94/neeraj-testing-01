package com.example.rbac.publicapi.blog.service;

import com.example.rbac.publicapi.blog.dto.BlogCategoryDto;
import com.example.rbac.publicapi.blog.mapper.PublicBlogMapper;
import com.example.rbac.publicapi.blog.repository.PublicBlogCategoryRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class PublicBlogCategoryService {

    private final PublicBlogCategoryRepository categoryRepository;
    private final PublicBlogMapper publicBlogMapper;

    public PublicBlogCategoryService(PublicBlogCategoryRepository categoryRepository,
                                     PublicBlogMapper publicBlogMapper) {
        this.categoryRepository = categoryRepository;
        this.publicBlogMapper = publicBlogMapper;
    }

    public List<BlogCategoryDto> findAll() {
        return categoryRepository.findAll().stream()
                .map(publicBlogMapper::toCategoryDto)
                .collect(Collectors.toList());
    }
}
