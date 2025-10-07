package com.example.rbac.gallery.service;

import org.springframework.core.io.Resource;

public record GalleryFileContent(Resource resource, String mimeType, String filename) {
}
