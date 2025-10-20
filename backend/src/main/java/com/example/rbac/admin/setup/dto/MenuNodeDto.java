package com.example.rbac.admin.setup.dto;

import java.util.ArrayList;
import java.util.List;

public class MenuNodeDto {

    private String key;
    private String label;
    private String icon;
    private String path;
    private boolean group;
    private List<String> permissions = new ArrayList<>();
    private List<MenuNodeDto> children = new ArrayList<>();

    public String getKey() {
        return key;
    }

    public void setKey(String key) {
        this.key = key;
    }

    public String getLabel() {
        return label;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public String getIcon() {
        return icon;
    }

    public void setIcon(String icon) {
        this.icon = icon;
    }

    public String getPath() {
        return path;
    }

    public void setPath(String path) {
        this.path = path;
    }

    public boolean isGroup() {
        return group;
    }

    public void setGroup(boolean group) {
        this.group = group;
    }

    public List<String> getPermissions() {
        return permissions;
    }

    public void setPermissions(List<String> permissions) {
        this.permissions = permissions;
    }

    public List<MenuNodeDto> getChildren() {
        return children;
    }

    public void setChildren(List<MenuNodeDto> children) {
        this.children = children;
    }
}
