export const TEC_ROUTES = {
  HUB:       'https://tec-app.vercel.app/hub',
  SETTINGS:  'https://tec-app.vercel.app/settings',
  DASHBOARD: 'https://tec-app.vercel.app/dashboard',
} as const;

export const goToTEC = (path: keyof typeof TEC_ROUTES): void => {
  window.location.href = TEC_ROUTES[path];
};
