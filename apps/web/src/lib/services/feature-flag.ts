const FLAG_KEY = 'NEXT_PUBLIC_AIOS_V1_REAL_LOGIC';

export function isRealLogicEnabled(): boolean {
  const val = process.env[FLAG_KEY];
  if (val === undefined) return false;
  return val === 'true' || val === '1';
}

export function withFeatureFlag<T>(
  realFn: () => T | Promise<T>,
  fallbackFn: () => T | Promise<T>,
): T | Promise<T> {
  return isRealLogicEnabled() ? realFn() : fallbackFn();
}
