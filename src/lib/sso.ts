// The Hub's SSO entry for this app (the hop the page hook has always made).
const HUB_URL = process.env.NEXT_PUBLIC_HUB_URL ?? 'https://hub.tecosystem.app';
export const appOrigin = (): string => (typeof window === 'undefined' ? '' : window.location.origin);
export const ssoUrl = (): string => `${HUB_URL}/api/auth/sso?target=${encodeURIComponent(appOrigin() + '/app')}`;
export { HUB_URL };
