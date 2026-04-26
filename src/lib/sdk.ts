import { getAccessToken, getStoredUser } from '@/lib-client/pi/pi-auth';

// ✅ Tec-Assets uses BFF only — no TecSdk needed
export const sdk = {
  clearAuthToken: () => {},
  payment: {
    resolveIncomplete: async (_id: string) => ({ status: 'skipped' }),
  },
};

const getToken = (): string | null => getAccessToken();

const getUserId = (): string | null => {
  const user = getStoredUser() as { id?: string; uid?: string } | null;
  return user?.id ?? user?.uid ?? null;
};

export { getToken, getUserId };
export default sdk;
