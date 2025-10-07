package com.example.rbac.gallery.service;

import com.example.rbac.activity.service.ActivityRecorder;
import com.example.rbac.common.exception.ApiException;
import com.example.rbac.common.pagination.PageResponse;
import com.example.rbac.gallery.dto.*;
import com.example.rbac.gallery.model.GalleryFile;
import com.example.rbac.gallery.model.GalleryFolder;
import com.example.rbac.gallery.repository.GalleryFileRepository;
import com.example.rbac.gallery.repository.GalleryFolderRepository;
import com.example.rbac.users.model.User;
import com.example.rbac.users.model.UserPrincipal;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;

@Service
public class GalleryService {

    private static final String MODULE_NAME = "Gallery";

    private final GalleryFileRepository fileRepository;
    private final GalleryFolderRepository folderRepository;
    private final GallerySettingsService settingsService;
    private final GalleryStorageService storageService;
    private final ActivityRecorder activityRecorder;

    public GalleryService(GalleryFileRepository fileRepository,
                          GalleryFolderRepository folderRepository,
                          GallerySettingsService settingsService,
                          GalleryStorageService storageService,
                          ActivityRecorder activityRecorder) {
        this.fileRepository = fileRepository;
        this.folderRepository = folderRepository;
        this.settingsService = settingsService;
        this.storageService = storageService;
        this.activityRecorder = activityRecorder;
    }

    @Transactional(readOnly = true)
    public PageResponse<GalleryFileDto> list(int page,
                                             int size,
                                             String sort,
                                             String direction,
                                             Long folderId,
                                             Long uploaderId,
                                             String uploaderEmail,
                                             String search,
                                             UserPrincipal principal) {
        boolean canViewAll = hasAuthority(principal, "GALLERY_VIEW_ALL");
        Long currentUserId = resolveUserId(principal);

        GalleryFolder selectedFolder = resolveFolder(folderId, principal);
        Long effectiveFolderId = selectedFolder != null ? selectedFolder.getId() : null;

        Specification<GalleryFile> specification = Specification.where(null);
        specification = GalleryFileSpecifications.and(specification, GalleryFileSpecifications.belongsToFolder(effectiveFolderId));
        specification = GalleryFileSpecifications.and(specification, GalleryFileSpecifications.search(search));

        if (uploaderId != null && canViewAll) {
            specification = GalleryFileSpecifications.and(specification, GalleryFileSpecifications.uploadedBy(uploaderId));
        }
        if (uploaderEmail != null && canViewAll) {
            specification = GalleryFileSpecifications.and(specification, GalleryFileSpecifications.uploaderEmailContains(uploaderEmail));
        }
        if (!canViewAll && currentUserId != null) {
            specification = GalleryFileSpecifications.and(specification, GalleryFileSpecifications.uploadedBy(currentUserId));
        }

        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(size, 1), resolveSort(sort, direction));
        Page<GalleryFileDto> result = fileRepository.findAll(specification, pageable).map(this::toDto);
        return PageResponse.from(result);
    }

    @Transactional
    public List<GalleryFileDto> upload(Long folderId, List<MultipartFile> files, UserPrincipal principal) {
        if (files == null || files.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "No files provided for upload");
        }
        User uploader = resolveUser(principal);
        GalleryFolder folder = resolveFolder(folderId, principal);
        List<String> allowedExtensions = settingsService.resolveAllowedExtensions();
        List<GalleryFileDto> uploaded = new ArrayList<>();
        List<Long> fileIds = new ArrayList<>();

        for (MultipartFile file : files) {
            GalleryFile entity = storeFile(folder, uploader, file, allowedExtensions);
            uploaded.add(toDto(entity));
            fileIds.add(entity.getId());
        }

        Map<String, Object> context = new HashMap<>();
        context.put("fileIds", fileIds);
        if (folder != null) {
            context.put("folderId", folder.getId());
            context.put("folderPath", folder.getPath());
        }
        activityRecorder.record(MODULE_NAME, "UPLOAD", "Uploaded " + uploaded.size() + " file(s)", "SUCCESS", context);
        return uploaded;
    }

    @Transactional
    public GalleryFileDto updateFile(Long id, GalleryFileUpdateRequest request) {
        GalleryFile file = fileRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "File not found"));
        String displayName = request.getDisplayName().trim();
        GalleryFolder targetFolder = findFolderById(request.getTargetFolderId());
        boolean changed = false;

        if (!displayName.equals(file.getDisplayName())) {
            file.setDisplayName(displayName);
            changed = true;
        }

        Long currentFolderId = file.getFolder() != null ? file.getFolder().getId() : null;
        Long targetFolderId = targetFolder != null ? targetFolder.getId() : null;
        if (!Objects.equals(currentFolderId, targetFolderId)) {
            file.setFolder(targetFolder);
            changed = true;
        }

        if (!changed) {
            return toDto(file);
        }

        GalleryFile saved = fileRepository.save(file);
        activityRecorder.record(MODULE_NAME, "UPDATE", "Updated file " + saved.getDisplayName(), "SUCCESS", buildFileContext(saved));
        return toDto(saved);
    }

    @Transactional
    public void delete(Long id, UserPrincipal principal) {
        GalleryFile file = fileRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "File not found"));
        enforceDeletePermission(file, principal);
        fileRepository.delete(file);
        storageService.delete(file.getStorageKey());
        activityRecorder.record(MODULE_NAME, "DELETE", "Deleted file " + file.getDisplayName(), "SUCCESS", buildFileContext(file));
    }

    @Transactional
    public void deleteBulk(GalleryBulkDeleteRequest request, UserPrincipal principal) {
        List<Long> ids = request.getIds();
        if (ids == null || ids.isEmpty()) {
            return;
        }
        List<GalleryFile> files = fileRepository.findAllById(ids);
        if (files.isEmpty()) {
            return;
        }
        Set<Long> permittedIds = new HashSet<>();
        for (GalleryFile file : files) {
            enforceDeletePermission(file, principal);
            permittedIds.add(file.getId());
        }
        List<String> storageKeys = files.stream()
                .filter(file -> permittedIds.contains(file.getId()))
                .map(GalleryFile::getStorageKey)
                .filter(Objects::nonNull)
                .toList();
        fileRepository.deleteAll(files);
        storageKeys.forEach(storageService::delete);
        Map<String, Object> context = new HashMap<>();
        context.put("fileIds", permittedIds);
        activityRecorder.record(MODULE_NAME, "DELETE", "Bulk deleted gallery files", "SUCCESS", context);
    }

    @Transactional(readOnly = true)
    public GalleryFileContent loadContent(Long id, UserPrincipal principal) {
        GalleryFile file = fileRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "File not found"));
        enforceViewPermission(file, principal);
        return new GalleryFileContent(
                storageService.loadAsResource(file.getStorageKey()),
                file.getMimeType(),
                file.getOriginalFilename()
        );
    }

    @Transactional(readOnly = true)
    public List<GalleryFolderDto> listFolders(UserPrincipal principal) {
        boolean canViewAll = hasAuthority(principal, "GALLERY_VIEW_ALL");
        User currentUser = resolveUser(principal);
        Sort sort = Sort.by(Sort.Order.asc("owner.id"), Sort.Order.asc("path"));

        List<GalleryFolder> folders;
        if (canViewAll) {
            folders = folderRepository.findAll(sort);
        } else if (currentUser != null && currentUser.getId() != null) {
            folders = folderRepository.findByOwnerId(currentUser.getId(), sort);
        } else {
            folders = Collections.emptyList();
        }

        List<GalleryFolderDto> result = new ArrayList<>();
        result.add(new GalleryFolderDto(null, "All Files", "/", null, true, null, null, null, null));
        for (GalleryFolder folder : folders) {
            result.add(toDto(folder));
        }
        return result;
    }

    @Transactional
    public GalleryFolderDto createFolder(GalleryFolderCreateRequest request, UserPrincipal principal) {
        GalleryFolder parent = resolveFolder(request.getParentId(), principal);
        User owner = parent != null ? parent.getOwner() : resolveUser(principal);
        if (owner == null) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Unable to determine folder owner");
        }

        GalleryFolder folder = new GalleryFolder();
        folder.setName(request.getName().trim());
        folder.setParent(parent);
        folder.setOwner(owner);
        folder.refreshComputedFields();
        ensureFolderPathUnique(folder);
        GalleryFolder saved = folderRepository.save(folder);
        activityRecorder.record(MODULE_NAME, "CREATE_FOLDER", "Created folder " + saved.getName(), "SUCCESS", buildFolderContext(saved));
        return toDto(saved);
    }

    @Transactional
    public GalleryFolderDto renameFolder(Long id, GalleryFolderRenameRequest request) {
        GalleryFolder folder = folderRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Folder not found"));
        folder.setName(request.getName().trim());
        folder.refreshComputedFields();
        ensureFolderPathUnique(folder);
        GalleryFolder saved = folderRepository.save(folder);
        refreshChildPaths(saved);
        activityRecorder.record(MODULE_NAME, "UPDATE_FOLDER", "Renamed folder " + saved.getName(), "SUCCESS", buildFolderContext(saved));
        return toDto(saved);
    }

    private void refreshChildPaths(GalleryFolder folder) {
        List<GalleryFolder> children = folderRepository.findByParentId(folder.getId());
        for (GalleryFolder child : children) {
            child.refreshComputedFields();
            folderRepository.save(child);
            refreshChildPaths(child);
        }
    }

    private void ensureFolderPathUnique(GalleryFolder folder) {
        folderRepository.findByPath(folder.getPath())
                .filter(existing -> !Objects.equals(existing.getId(), folder.getId()))
                .ifPresent(existing -> {
                    throw new ApiException(HttpStatus.BAD_REQUEST, "A folder with the same name already exists in this location");
                });
    }

    private GalleryFile storeFile(GalleryFolder folder, User uploader, MultipartFile file, List<String> allowedExtensions) {
        String originalName = Optional.ofNullable(file.getOriginalFilename()).orElse("file");
        String extension = extractExtension(originalName);
        if (extension.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "File " + originalName + " is missing an extension");
        }
        if (allowedExtensions.stream().noneMatch(ext -> ext.equalsIgnoreCase(extension))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "File type not allowed: " + extension);
        }
        String storageKey = storageService.store(file, folder != null ? folder.getPath() : "/", extension.toLowerCase(Locale.ROOT));
        GalleryFile entity = new GalleryFile();
        entity.setFolder(folder);
        entity.setUploader(uploader);
        entity.setDisplayName(deriveDisplayName(originalName));
        entity.setOriginalFilename(originalName);
        entity.setExtension(extension.toLowerCase(Locale.ROOT));
        entity.setMimeType(file.getContentType());
        entity.setSizeBytes(file.getSize());
        entity.setStorageKey(storageKey);
        return fileRepository.save(entity);
    }

    private String deriveDisplayName(String originalName) {
        int dotIndex = originalName.lastIndexOf('.');
        String base = dotIndex > 0 ? originalName.substring(0, dotIndex) : originalName;
        String trimmed = base.trim();
        return trimmed.isEmpty() ? "Untitled File" : trimmed;
    }

    private String extractExtension(String name) {
        int dotIndex = name.lastIndexOf('.');
        if (dotIndex < 0 || dotIndex == name.length() - 1) {
            return "";
        }
        return name.substring(dotIndex + 1).trim();
    }

    private Sort resolveSort(String sort, String direction) {
        String normalizedSort = sort == null ? "createdAt" : sort.trim();
        Sort.Direction sortDirection;
        if (normalizedSort.equalsIgnoreCase("createdAt") && (direction == null || direction.isBlank())) {
            sortDirection = Sort.Direction.DESC;
        } else {
            sortDirection = "asc".equalsIgnoreCase(direction) ? Sort.Direction.ASC : Sort.Direction.DESC;
        }
        return switch (normalizedSort.toLowerCase(Locale.ROOT)) {
            case "size" -> Sort.by(sortDirection, "sizeBytes");
            case "extension" -> Sort.by(sortDirection, "extension").and(Sort.by(Sort.Direction.ASC, "displayName"));
            case "uploader" -> Sort.by(sortDirection, "uploader.email").and(Sort.by(Sort.Direction.ASC, "displayName"));
            case "name" -> Sort.by(sortDirection, "displayName");
            default -> Sort.by(sortDirection, "createdAt");
        };
    }

    private boolean hasAuthority(UserPrincipal principal, String authority) {
        if (principal == null || principal.getAuthorities() == null) {
            return false;
        }
        return principal.getAuthorities().stream()
                .anyMatch(grantedAuthority -> authority.equalsIgnoreCase(grantedAuthority.getAuthority()));
    }

    private Long resolveUserId(UserPrincipal principal) {
        User user = resolveUser(principal);
        return user != null ? user.getId() : null;
    }

    private User resolveUser(UserPrincipal principal) {
        return principal != null ? principal.getUser() : null;
    }

    private void enforceDeletePermission(GalleryFile file, UserPrincipal principal) {
        if (hasAuthority(principal, "GALLERY_DELETE_ALL")) {
            return;
        }
        if (hasAuthority(principal, "GALLERY_DELETE_OWN")) {
            Long currentUserId = resolveUserId(principal);
            Long uploaderId = file.getUploader() != null ? file.getUploader().getId() : null;
            if (currentUserId != null && currentUserId.equals(uploaderId)) {
                return;
            }
        }
        throw new ApiException(HttpStatus.FORBIDDEN, "Not authorized to delete this file");
    }

    private void enforceViewPermission(GalleryFile file, UserPrincipal principal) {
        if (hasAuthority(principal, "GALLERY_VIEW_ALL")) {
            return;
        }
        if (hasAuthority(principal, "GALLERY_VIEW_OWN")) {
            Long currentUserId = resolveUserId(principal);
            Long uploaderId = file.getUploader() != null ? file.getUploader().getId() : null;
            if (currentUserId != null && currentUserId.equals(uploaderId)) {
                return;
            }
        }
        throw new ApiException(HttpStatus.FORBIDDEN, "Not authorized to view this file");
    }

    private GalleryFileDto toDto(GalleryFile file) {
        GalleryFileDto dto = new GalleryFileDto();
        dto.setId(file.getId());
        dto.setDisplayName(file.getDisplayName());
        dto.setOriginalFilename(file.getOriginalFilename());
        dto.setExtension(file.getExtension());
        dto.setMimeType(file.getMimeType());
        dto.setSizeBytes(file.getSizeBytes());
        dto.setUploadedAt(file.getCreatedAt());
        if (file.getUploader() != null) {
            dto.setUploadedById(file.getUploader().getId());
            dto.setUploadedByEmail(file.getUploader().getEmail());
            dto.setUploadedByName(file.getUploader().getFullName());
        }
        if (file.getFolder() != null) {
            dto.setFolderId(file.getFolder().getId());
            dto.setFolderPath(file.getFolder().getPath());
        } else {
            dto.setFolderId(null);
            dto.setFolderPath("/");
        }
        return dto;
    }

    private GalleryFolderDto toDto(GalleryFolder folder) {
        Long parentId = folder.getParent() != null ? folder.getParent().getId() : null;
        User owner = folder.getOwner();
        Long ownerId = owner != null ? owner.getId() : null;
        String ownerName = owner != null ? owner.getFullName() : null;
        String ownerEmail = owner != null ? owner.getEmail() : null;
        String ownerKey = buildOwnerKey(owner);
        boolean isRoot = folder.getParent() == null;
        return new GalleryFolderDto(folder.getId(), folder.getName(), folder.getPath(), parentId, isRoot, ownerId, ownerName, ownerEmail, ownerKey);
    }

    private String buildOwnerKey(User owner) {
        if (owner == null || owner.getId() == null) {
            return null;
        }
        return String.format(Locale.ROOT, "USR-%04d", owner.getId());
    }

    private GalleryFolder resolveFolder(Long folderId, UserPrincipal principal) {
        if (folderId == null) {
            return null;
        }
        GalleryFolder folder = findFolderById(folderId);
        if (!canAccessFolder(folder, principal)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Not authorized to access this folder");
        }
        return folder;
    }

    private GalleryFolder findFolderById(Long folderId) {
        if (folderId == null) {
            return null;
        }
        return folderRepository.findById(folderId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Folder not found"));
    }

    private boolean canAccessFolder(GalleryFolder folder, UserPrincipal principal) {
        if (folder == null) {
            return true;
        }
        if (hasAuthority(principal, "GALLERY_VIEW_ALL") || hasAuthority(principal, "GALLERY_EDIT_ALL")) {
            return true;
        }
        User owner = folder.getOwner();
        if (owner == null || owner.getId() == null) {
            return false;
        }
        User currentUser = resolveUser(principal);
        return currentUser != null && owner.getId().equals(currentUser.getId());
    }

    private Map<String, Object> buildFileContext(GalleryFile file) {
        Map<String, Object> context = new HashMap<>();
        context.put("fileId", file.getId());
        context.put("fileName", file.getDisplayName());
        context.put("folderId", file.getFolder() != null ? file.getFolder().getId() : null);
        context.put("folderPath", file.getFolder() != null ? file.getFolder().getPath() : "/");
        context.put("uploaderId", file.getUploader() != null ? file.getUploader().getId() : null);
        return context;
    }

    private Map<String, Object> buildFolderContext(GalleryFolder folder) {
        Map<String, Object> context = new HashMap<>();
        context.put("folderId", folder.getId());
        context.put("name", folder.getName());
        context.put("path", folder.getPath());
        context.put("parentId", folder.getParent() != null ? folder.getParent().getId() : null);
        if (folder.getOwner() != null) {
            context.put("ownerId", folder.getOwner().getId());
            context.put("ownerEmail", folder.getOwner().getEmail());
        }
        return context;
    }
}
