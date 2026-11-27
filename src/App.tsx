import { AppDataProvider } from './hooks/useAppData';
import { UIProvider, useUI } from './hooks/useUI';
import { CaregiverProvider } from './hooks/useCaregiver';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Splash } from './components/Splash';
import { DeviceLayout } from './layouts/DeviceLayout';
import { HomePage } from './pages/HomePage';
import { PeoplePage } from './pages/PeoplePage';
import { WorldPage } from './pages/WorldPage';
import { CarePage } from './pages/CarePage';

function CurrentSection() {
  const { section } = useUI();
  switch (section) {
    case 'gente':
      return <PeoplePage />;
    case 'mundo':
      return <WorldPage />;
    case 'cuidado':
      return <CarePage />;
    default:
      return <HomePage />;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppDataProvider>
        <UIProvider>
          <CaregiverProvider>
            <DeviceLayout>
              <CurrentSection />
            </DeviceLayout>
            <Splash />
          </CaregiverProvider>
        </UIProvider>
      </AppDataProvider>
    </ErrorBoundary>
  );
}
