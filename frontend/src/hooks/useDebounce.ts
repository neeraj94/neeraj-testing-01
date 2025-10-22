import { useEffect, useState } from 'react';

export const useDebounce = <T,>(value: T, delay = 250): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedValue(value), delay);
    return () => window.clearTimeout(handle);
  }, [value, delay]);

  return debouncedValue;
};

export default useDebounce;
