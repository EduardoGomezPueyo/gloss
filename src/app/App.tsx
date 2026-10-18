import { createBrowserRouter, RouterProvider } from 'react-router';
import { routes } from './routes';
import { ThemeProvider } from './theme/ThemeProvider';

const router = createBrowserRouter(routes);

export function App() {
  return (
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  );
}
