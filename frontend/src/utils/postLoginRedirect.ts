import { safeSessionStorage } from './storage';

const redirectKey = 'rbac.postLogin.redirect';
const fallbackKey = 'rbac.postLogin.fallback';

export const rememberPostLoginRedirect = (target: string, fallback?: string) => {
  if (!target) {
    return;
  }
  safeSessionStorage.setItem(redirectKey, target);
  if (fallback) {
    safeSessionStorage.setItem(fallbackKey, fallback);
  } else {
    safeSessionStorage.removeItem(fallbackKey);
  }
};

export const consumePostLoginRedirect = () => {
  const target = safeSessionStorage.getItem(redirectKey);
  const fallback = safeSessionStorage.getItem(fallbackKey);
  if (target) {
    safeSessionStorage.removeItem(redirectKey);
  }
  if (fallback) {
    safeSessionStorage.removeItem(fallbackKey);
  }
  return { target, fallback };
};

export const clearPostLoginRedirect = () => {
  safeSessionStorage.removeItem(redirectKey);
  safeSessionStorage.removeItem(fallbackKey);
};
