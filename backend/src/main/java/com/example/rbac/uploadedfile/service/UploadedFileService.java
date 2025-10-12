package com.example.rbac.uploadedfile.service;

import com.example.rbac.common.pagination.PageResponse;
import com.example.rbac.uploadedfile.dto.UploadedFileDto;
import com.example.rbac.uploadedfile.dto.UploadedFileModuleDto;
import com.example.rbac.uploadedfile.dto.UploadedFileUploaderDto;
import com.example.rbac.uploadedfile.mapper.UploadedFileMapper;
import com.example.rbac.uploadedfile.model.UploadedFile;
import com.example.rbac.uploadedfile.model.UploadedFileModule;
import com.example.rbac.uploadedfile.repository.UploadedFileRepository;
import com.example.rbac.uploadedfile.spec.UploadedFileSpecifications;
import com.example.rbac.users.model.User;
import com.example.rbac.users.model.UserPrincipal;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Arrays;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class UploadedFileService {

    private static final String FILE_TYPE_IMAGE = "IMAGE";
    private static final String FILE_TYPE_VIDEO = "VIDEO";
    private static final String FILE_TYPE_AUDIO = "AUDIO";
    private static final String FILE_TYPE_DOCUMENT = "DOCUMENT";

    private final UploadedFileRepository repository;

    public UploadedFileService(UploadedFileRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public void recordUpload(UploadedFileModule module,
                             String storageKey,
                             String publicUrl,
                             String originalFilename,
                             String mimeType,
                             long sizeBytes) {
        UploadedFile file = new UploadedFile();
        file.setModule(module);
        file.setFeatureName(module.getFeatureName());
        file.setContextLabel(module.getContextLabel());
        file.setStorageKey(StringUtils.hasText(storageKey) ? storageKey : null);
        file.setPublicUrl(StringUtils.hasText(publicUrl) ? publicUrl : null);
        file.setOriginalFilename(StringUtils.hasText(originalFilename) ? originalFilename : null);
        file.setMimeType(StringUtils.hasText(mimeType) ? mimeType : null);
        file.setFileType(resolveFileType(mimeType));
        file.setSizeBytes(sizeBytes > 0 ? sizeBytes : null);

        resolveCurrentUser().ifPresent(userInfo -> {
            file.setUploadedById(userInfo.id());
            file.setUploadedByName(userInfo.name());
        });

        repository.save(file);
    }

    @Transactional(readOnly = true)
    public PageResponse<UploadedFileDto> list(int page,
                                              int size,
                                              List<String> moduleKeys,
                                              String feature,
                                              String fileType,
                                              Long uploadedById,
                                              LocalDate from,
                                              LocalDate to,
                                              String search) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(size, 1), Sort.by(Sort.Direction.DESC, "uploadedAt"));

        Set<UploadedFileModule> modules = convertModuleKeys(moduleKeys);
        Instant fromInstant = from != null ? from.atStartOfDay().toInstant(ZoneOffset.UTC) : null;
        Instant toInstant = to != null ? to.plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC).minusMillis(1) : null;

        Page<UploadedFile> result = repository.findAll(
                UploadedFileSpecifications.filter(modules, feature, fileType, uploadedById, fromInstant, toInstant, search),
                pageable
        );

        List<UploadedFileDto> content = result.getContent().stream()
                .map(UploadedFileMapper::toDto)
                .collect(Collectors.toList());

        return new PageResponse<>(content,
                result.getTotalElements(),
                result.getTotalPages(),
                result.getNumber(),
                result.getSize());
    }

    @Transactional(readOnly = true)
    public UploadedFileDto get(Long id) {
        UploadedFile file = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Uploaded file not found"));
        return UploadedFileMapper.toDto(file);
    }

    @Transactional(readOnly = true)
    public List<UploadedFileModuleDto> listModules() {
        return Arrays.stream(UploadedFileModule.values())
                .map(module -> new UploadedFileModuleDto(module.name(), module.getFeatureName(), module.getContextLabel()))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<UploadedFileUploaderDto> listUploaders() {
        return repository.findDistinctUploaders().stream()
                .filter(uploader -> uploader.getId() != null && StringUtils.hasText(uploader.getName()))
                .collect(Collectors.toList());
    }

    @Transactional
    public void delete(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return;
        }
        List<Long> uniqueIds = ids.stream()
                .filter(Objects::nonNull)
                .distinct()
                .collect(Collectors.toList());
        if (uniqueIds.isEmpty()) {
            return;
        }
        repository.deleteAllByIdInBatch(uniqueIds);
    }

    private Set<UploadedFileModule> convertModuleKeys(List<String> moduleKeys) {
        if (moduleKeys == null || moduleKeys.isEmpty()) {
            return EnumSet.noneOf(UploadedFileModule.class);
        }
        return moduleKeys.stream()
                .filter(Objects::nonNull)
                .map(UploadedFileModule::fromValue)
                .filter(Optional::isPresent)
                .map(Optional::get)
                .collect(Collectors.toCollection(() -> EnumSet.noneOf(UploadedFileModule.class)));
    }

    private Optional<UserInfo> resolveCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return Optional.empty();
        }
        Object principal = authentication.getPrincipal();
        if (principal instanceof UserPrincipal userPrincipal) {
            User user = userPrincipal.getUser();
            if (user == null) {
                return Optional.empty();
            }
            return Optional.of(new UserInfo(user.getId(), resolveDisplayName(user)));
        }
        if (principal instanceof User user) {
            return Optional.of(new UserInfo(user.getId(), resolveDisplayName(user)));
        }
        return Optional.empty();
    }

    private String resolveDisplayName(User user) {
        if (user == null) {
            return null;
        }
        if (StringUtils.hasText(user.getFullName())) {
            return user.getFullName();
        }
        if (StringUtils.hasText(user.getEmail())) {
            return user.getEmail();
        }
        return null;
    }

    private String resolveFileType(String mimeType) {
        if (!StringUtils.hasText(mimeType)) {
            return null;
        }
        String lower = mimeType.toLowerCase(Locale.ROOT);
        if (lower.startsWith("image/")) {
            return FILE_TYPE_IMAGE;
        }
        if (lower.startsWith("video/")) {
            return FILE_TYPE_VIDEO;
        }
        if (lower.startsWith("audio/")) {
            return FILE_TYPE_AUDIO;
        }
        return FILE_TYPE_DOCUMENT;
    }

    private record UserInfo(Long id, String name) {
    }
}
