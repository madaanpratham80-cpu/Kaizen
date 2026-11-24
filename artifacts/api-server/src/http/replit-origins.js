// Only accept origins provisioned for this project, never the request's
// Host or forwarded headers as proof that a mutation came from Kaizen.
export function appOrigins(env = process.env) {
  if (env.APP_ORIGIN) return [new URL(env.APP_ORIGIN).origin];

  const domains = [
    ...(env.REPLIT_DOMAINS ?? '').split(','),
    ...(env.NODE_ENV === 'production' ? [] : [env.REPLIT_DEV_DOMAIN]),
  ];
  return [...new Set(domains.flatMap((value) => {
    const domain = value?.trim();
    return domain ? [new URL(`https://${domain}`).origin] : [];
  }))];
}
