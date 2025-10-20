package com.example.rbac.admin.setup.dto;

import java.util.ArrayList;
import java.util.List;

public class MenuNodeConfigDto {

    private String key;
    private List<MenuNodeConfigDto> children = new ArrayList<>();

    public String getKey() {
        return key;
    }

    public void setKey(String key) {
        this.key = key;
    }

    public List<MenuNodeConfigDto> getChildren() {
        return children;
    }

    public void setChildren(List<MenuNodeConfigDto> children) {
        this.children = children;
    }
}
