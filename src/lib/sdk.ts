import { getAccessToken, getStoredUser } from '@/lib-client/pi/pi-auth';

// ✅ Tec-Assets uses BFF only — no TecSdk needed
const getToken = (): string | null => getAccessToken();

const getUserId = (): string | null => {
  const user = getStoredUser() as { id?: string; uid?: string } | null;
  return user?.id ?? user?.uid ?? null;
};

// ✅ stub clearAuthToken — no Pi SDK
export const sdk = {
  clearAuthToken: () => {},
};

export { getToken, getUserId };
export default sdk;
