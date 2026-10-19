import { createBrowserRouter, RouterProvider } from 'react-router';
import { CurrentUserProvider } from './currentUser/CurrentUserProvider';
import { DataProvider } from './DataProvider';
import { routes } from './routes';
import { ThemeProvider } from './theme/ThemeProvider';

const router = createBrowserRouter(routes);

export function App() {
  return (
    <ThemeProvider>
      <DataProvider>
        <CurrentUserProvider>
          <RouterProvider router={router} />
        </CurrentUserProvider>
      </DataProvider>
    </ThemeProvider>
  );
}
