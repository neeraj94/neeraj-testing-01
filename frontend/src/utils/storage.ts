export const safeLocalStorage = {
  getItem(key: string): string | null {
    if (typeof window === 'undefined') {
      return null;
    }
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      console.warn('Unable to read from localStorage:', error);
      return null;
    }
  },
  setItem(key: string, value: string) {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      console.warn('Unable to write to localStorage:', error);
    }
  },
  removeItem(key: string) {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      console.warn('Unable to remove from localStorage:', error);
    }
  }
};

export const safeSessionStorage = {
  getItem(key: string): string | null {
    if (typeof window === 'undefined') {
      return null;
    }
    try {
      return window.sessionStorage.getItem(key);
    } catch (error) {
      console.warn('Unable to read from sessionStorage:', error);
      return null;
    }
  },
  setItem(key: string, value: string) {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      window.sessionStorage.setItem(key, value);
    } catch (error) {
      console.warn('Unable to write to sessionStorage:', error);
    }
  },
  removeItem(key: string) {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      window.sessionStorage.removeItem(key);
    } catch (error) {
      console.warn('Unable to remove from sessionStorage:', error);
    }
  }
};
