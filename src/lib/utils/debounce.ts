export const debounce = <T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): T & { cancel: () => void } => {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  const debounced = (...args: Parameters<T>): void => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
  debounced.cancel = (): void => {
    if (timeout) clearTimeout(timeout);
  };
  return debounced as T & { cancel: () => void };
};
