import type { ReactNode } from 'react';
import { Route, Router, Switch, useLocation } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { ProtectedRoute } from './auth/protected-route.jsx';
import Home from './app/page.jsx';
import Login from './app/login/page.jsx';
import Register from './app/register/page.jsx';
import NotFound from './app/not-found.jsx';
import SignedInLayout from './app/(signed-in)/layout.jsx';
import Today from './app/(signed-in)/today/page.jsx';
import Quests from './app/(signed-in)/quests/page.jsx';
import Habits from './app/(signed-in)/habits/page.jsx';
import Progress from './app/(signed-in)/progress/page.jsx';
import Profile from './app/(signed-in)/profile/page.jsx';
import Settings from './app/(signed-in)/settings/page.jsx';
import Onboarding from './app/(signed-in)/onboarding/page.jsx';

const accountRoutes = {
  '/today': Today,
  '/quests': Quests,
  '/habits': Habits,
  '/progress': Progress,
  '/profile': Profile,
  '/settings': Settings,
  '/onboarding': Onboarding,
};

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function AccountRoutes() {
  const [location] = useLocation();
  const path = location.replace(/\/$/, '');
  const Page = Object.hasOwn(accountRoutes, path)
    ? accountRoutes[path as keyof typeof accountRoutes]
    : null;
  if (!Page) return <NotFound />;
  return (
    <ProtectedRoute>
      <SignedInLayout>
        <RoutedErrorBoundary><Page /></RoutedErrorBoundary>
      </SignedInLayout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <Router base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route component={AccountRoutes} />
      </Switch>
    </Router>
  );
}
