export const TEC_ROUTES = {
  HUB:       'https://tec-app-frontend.vercel.app/hub',
  SETTINGS:  'https://tec-assets-app.vercel.app/app/settings',
  DASHBOARD: 'https://tec-app-frontend.vercel.app/dashboard',
} as const;

export const goToTEC = (path: keyof typeof TEC_ROUTES): void => {
  if (path === 'HUB') {
    // ✅ روح Hub عن طريق SSO من Assets
    window.location.href = '/api/auth/sso?target=' +
      encodeURIComponent('https://tec-app-frontend.vercel.app');
    return;
  }
  window.location.replace(TEC_ROUTES[path]);
};
