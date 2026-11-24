const labels = {
  loading: 'Loading…',
  empty: 'Nothing to show yet.',
  error: 'Could not load this screen. Try again.',
  offline: 'You’re offline. Reconnect to try again.',
  'expired-session': 'Your session expired. Log in to continue.',
  'catching-up': 'Catching up on your calendar…',
  'version-conflict':
    'Progress changed while loading. Reload to show a consistent snapshot.',
};

/**
 * @param {{state: keyof typeof labels}} props
 * @returns {import('react').ReactElement}
 */
export function ScreenState({ state }) {
  const role =
    state === 'error' ||
    state === 'expired-session' ||
    state === 'version-conflict'
      ? 'alert'
      : 'status';
  return <p role={role}>{labels[state]}</p>;
}
