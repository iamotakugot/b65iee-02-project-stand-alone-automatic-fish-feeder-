import { useRef, useCallback } from "react";

interface UsePreventDoubleSubmitReturn {
  isSubmitting: (key: string) => boolean;
  withSubmitProtection: <T extends any[]>(
    key: string,
    fn: (...args: T) => Promise<any> | any,
  ) => (...args: T) => Promise<void>;
}

export const usePreventDoubleSubmit = (): UsePreventDoubleSubmitReturn => {
  const submittingKeysRef = useRef<Set<string>>(new Set());

  const isSubmitting = useCallback((key: string): boolean => {
    return submittingKeysRef.current.has(key);
  }, []);

  const withSubmitProtection = useCallback(
    <T extends any[]>(key: string, fn: (...args: T) => Promise<any> | any) => {
      return async (...args: T): Promise<void> => {
        // Prevent double submit
        if (submittingKeysRef.current.has(key)) {
          console.warn(
            `⚠️ ${key} already in progress, ignoring duplicate request`,
          );

          return;
        }

        try {
          submittingKeysRef.current.add(key);
          await fn(...args);
        } catch (error) {
          console.error(`❌ ${key} failed:`, error);
          throw error;
        } finally {
          submittingKeysRef.current.delete(key);
        }
      };
    },
    [],
  );

  return {
    isSubmitting,
    withSubmitProtection,
  };
};
