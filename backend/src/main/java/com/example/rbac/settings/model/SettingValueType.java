package com.example.rbac.settings.model;

public enum SettingValueType {
    STRING,
    TEXT,
    NUMBER,
    BOOLEAN,
    COLOR;

    public boolean isBoolean() {
        return this == BOOLEAN;
    }

    public boolean isNumeric() {
        return this == NUMBER;
    }

    public boolean isColor() {
        return this == COLOR;
    }
}
