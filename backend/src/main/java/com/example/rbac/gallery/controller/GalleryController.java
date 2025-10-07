package com.example.rbac.gallery.controller;

import com.example.rbac.common.pagination.PageResponse;
import com.example.rbac.gallery.dto.*;
import com.example.rbac.gallery.service.GalleryFileContent;
import com.example.rbac.gallery.service.GalleryService;
import com.example.rbac.users.model.UserPrincipal;
import jakarta.validation.Valid;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
@RequestMapping("/api/v1/gallery")
public class GalleryController {

    private final GalleryService galleryService;

    public GalleryController(GalleryService galleryService) {
        this.galleryService = galleryService;
    }

    @GetMapping("/files")
    @PreAuthorize("hasAnyAuthority('GALLERY_VIEW_ALL','GALLERY_VIEW_OWN')")
    public PageResponse<GalleryFileDto> listFiles(@RequestParam(name = "page", defaultValue = "0") int page,
                                                  @RequestParam(name = "size", defaultValue = "20") int size,
                                                  @RequestParam(name = "sort", required = false) String sort,
                                                  @RequestParam(name = "direction", required = false) String direction,
                                                  @RequestParam(name = "folderId", required = false) Long folderId,
                                                  @RequestParam(name = "uploaderId", required = false) Long uploaderId,
                                                  @RequestParam(name = "uploader", required = false) String uploaderEmail,
                                                  @RequestParam(name = "search", required = false) String search,
                                                  @AuthenticationPrincipal UserPrincipal principal) {
        return galleryService.list(page, size, sort, direction, folderId, uploaderId, uploaderEmail, search, principal);
    }

    @PostMapping("/files")
    @PreAuthorize("hasAuthority('GALLERY_CREATE')")
    public List<GalleryFileDto> uploadFiles(@RequestParam(name = "folderId", required = false) Long folderId,
                                            @RequestParam("files") List<MultipartFile> files,
                                            @AuthenticationPrincipal UserPrincipal principal) {
        return galleryService.upload(folderId, files, principal);
    }

    @PatchMapping("/files/{id}")
    @PreAuthorize("hasAuthority('GALLERY_EDIT_ALL')")
    public GalleryFileDto updateFile(@PathVariable("id") Long id,
                                     @Valid @RequestBody GalleryFileUpdateRequest request) {
        return galleryService.updateFile(id, request);
    }

    @DeleteMapping("/files/{id}")
    @PreAuthorize("hasAnyAuthority('GALLERY_DELETE_ALL','GALLERY_DELETE_OWN')")
    public void deleteFile(@PathVariable("id") Long id,
                           @AuthenticationPrincipal UserPrincipal principal) {
        galleryService.delete(id, principal);
    }

    @PostMapping("/files/bulk-delete")
    @PreAuthorize("hasAnyAuthority('GALLERY_DELETE_ALL','GALLERY_DELETE_OWN')")
    public void bulkDelete(@Valid @RequestBody GalleryBulkDeleteRequest request,
                           @AuthenticationPrincipal UserPrincipal principal) {
        galleryService.deleteBulk(request, principal);
    }

    @GetMapping("/files/{id}/content")
    @PreAuthorize("hasAnyAuthority('GALLERY_VIEW_ALL','GALLERY_VIEW_OWN')")
    public ResponseEntity<Resource> downloadFile(@PathVariable("id") Long id,
                                                  @AuthenticationPrincipal UserPrincipal principal) {
        GalleryFileContent content = galleryService.loadContent(id, principal);
        String filename = encodeFilename(content.filename());
        MediaType mediaType = content.mimeType() != null ? MediaType.parseMediaType(content.mimeType()) : MediaType.APPLICATION_OCTET_STREAM;
        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                .body(content.resource());
    }

    @GetMapping("/folders")
    @PreAuthorize("hasAnyAuthority('GALLERY_VIEW_ALL','GALLERY_VIEW_OWN','GALLERY_CREATE','GALLERY_EDIT_ALL')")
    public List<GalleryFolderDto> listFolders(@AuthenticationPrincipal UserPrincipal principal) {
        return galleryService.listFolders(principal);
    }

    @PostMapping("/folders")
    @PreAuthorize("hasAuthority('GALLERY_CREATE')")
    public GalleryFolderDto createFolder(@Valid @RequestBody GalleryFolderCreateRequest request,
                                         @AuthenticationPrincipal UserPrincipal principal) {
        return galleryService.createFolder(request, principal);
    }

    @PatchMapping("/folders/{id}")
    @PreAuthorize("hasAuthority('GALLERY_EDIT_ALL')")
    public GalleryFolderDto renameFolder(@PathVariable("id") Long id,
                                         @Valid @RequestBody GalleryFolderRenameRequest request) {
        return galleryService.renameFolder(id, request);
    }

    private String encodeFilename(String filename) {
        if (filename == null || filename.isBlank()) {
            return "file";
        }
        return URLEncoder.encode(filename, StandardCharsets.UTF_8).replaceAll("\\+", "%20");
    }
}
