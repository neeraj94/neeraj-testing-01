package com.example.rbac.wedges.service;

import com.example.rbac.activity.service.ActivityRecorder;
import com.example.rbac.categories.model.Category;
import com.example.rbac.categories.repository.CategoryRepository;
import com.example.rbac.common.exception.ApiException;
import com.example.rbac.common.pagination.PageResponse;
import com.example.rbac.wedges.dto.WedgeDto;
import com.example.rbac.wedges.dto.WedgeRequest;
import com.example.rbac.wedges.mapper.WedgeMapper;
import com.example.rbac.wedges.model.Wedge;
import com.example.rbac.wedges.repository.WedgeRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Service
public class WedgeService {

    private final WedgeRepository wedgeRepository;
    private final CategoryRepository categoryRepository;
    private final WedgeMapper wedgeMapper;
    private final ActivityRecorder activityRecorder;
    private final WedgeIconStorageService iconStorageService;

    public WedgeService(WedgeRepository wedgeRepository,
                        CategoryRepository categoryRepository,
                        WedgeMapper wedgeMapper,
                        ActivityRecorder activityRecorder,
                        WedgeIconStorageService iconStorageService) {
        this.wedgeRepository = wedgeRepository;
        this.categoryRepository = categoryRepository;
        this.wedgeMapper = wedgeMapper;
        this.activityRecorder = activityRecorder;
        this.iconStorageService = iconStorageService;
    }

    @Transactional(readOnly = true)
    public PageResponse<WedgeDto> list(int page, int size, String search) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(size, 1), Sort.by(Sort.Direction.ASC, "name"));
        Page<Wedge> wedges;
        if (StringUtils.hasText(search)) {
            String term = search.trim();
            wedges = wedgeRepository.findByNameContainingIgnoreCase(term, pageable);
        } else {
            wedges = wedgeRepository.findAll(pageable);
        }
        return PageResponse.from(wedges.map(this::mapToDto));
    }

    @Transactional(readOnly = true)
    public WedgeDto get(Long id) {
        Wedge wedge = wedgeRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Wedge not found"));
        return mapToDto(wedge);
    }

    @Transactional
    public WedgeDto create(WedgeRequest request) {
        validateNameUniqueness(request.getName(), null);
        Wedge wedge = new Wedge();
        applyRequest(wedge, request);
        Wedge saved = wedgeRepository.save(wedge);
        handleDefault(saved);
        activityRecorder.record("Catalog", "WEDGE_CREATED", "Created wedge " + saved.getName(), "SUCCESS", buildContext(saved));
        return mapToDto(saved);
    }

    @Transactional
    public WedgeDto update(Long id, WedgeRequest request) {
        Wedge wedge = wedgeRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Wedge not found"));
        validateNameUniqueness(request.getName(), id);
        applyRequest(wedge, request);
        Wedge saved = wedgeRepository.save(wedge);
        handleDefault(saved);
        activityRecorder.record("Catalog", "WEDGE_UPDATED", "Updated wedge " + saved.getName(), "SUCCESS", buildContext(saved));
        return mapToDto(saved);
    }

    @Transactional
    public void delete(Long id) {
        Wedge wedge = wedgeRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Wedge not found"));
        wedgeRepository.delete(wedge);
        activityRecorder.record("Catalog", "WEDGE_DELETED", "Deleted wedge " + wedge.getName(), "SUCCESS", buildContext(wedge));
    }

    private void validateNameUniqueness(String name, Long wedgeId) {
        if (!StringUtils.hasText(name)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Wedge name is required");
        }
        String trimmed = name.trim();
        boolean exists = wedgeId == null
                ? wedgeRepository.existsByNameIgnoreCase(trimmed)
                : wedgeRepository.existsByNameIgnoreCaseAndIdNot(trimmed, wedgeId);
        if (exists) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "A wedge with this name already exists");
        }
    }

    private void applyRequest(Wedge wedge, WedgeRequest request) {
        wedge.setName(request.getName().trim());
        wedge.setIconUrl(iconStorageService.resolvePublicUrl(trimToNull(request.getIconUrl())));
        wedge.setShortDescription(trimToNull(request.getShortDescription()));
        wedge.setLongDescription(trimToNull(request.getLongDescription()));
        wedge.setDefaultWedge(request.isDefaultWedge());
        wedge.setCategory(resolveCategory(request.getCategoryId()));
    }

    private void handleDefault(Wedge wedge) {
        if (wedge.isDefaultWedge()) {
            wedgeRepository.clearDefaultExcept(wedge.getId());
        }
    }

    private Category resolveCategory(Long categoryId) {
        if (categoryId == null) {
            return null;
        }
        Optional<Category> category = categoryRepository.findById(categoryId);
        return category.orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Selected category not found"));
    }

    private String trimToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private Map<String, Object> buildContext(Wedge wedge) {
        Map<String, Object> context = new HashMap<>();
        context.put("wedgeId", wedge.getId());
        context.put("wedgeName", wedge.getName());
        context.put("default", wedge.isDefaultWedge());
        if (wedge.getCategory() != null) {
            context.put("categoryId", wedge.getCategory().getId());
            context.put("categoryName", wedge.getCategory().getName());
        }
        return context;
    }

    private WedgeDto mapToDto(Wedge wedge) {
        WedgeDto dto = wedgeMapper.toDto(wedge);
        dto.setIconUrl(iconStorageService.resolvePublicUrl(dto.getIconUrl()));
        return dto;
    }
}
