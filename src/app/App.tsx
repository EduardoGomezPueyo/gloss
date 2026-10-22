import { createBrowserRouter, RouterProvider } from 'react-router';
import { CurrentUserProvider } from './currentUser/CurrentUserProvider';
import { DataProvider } from './DataProvider';
import { OcrQueueProvider } from './ocr/OcrQueueProvider';
import { routes } from './routes';
import { ThemeProvider } from './theme/ThemeProvider';

const router = createBrowserRouter(routes);

export function App() {
  return (
    <ThemeProvider>
      <DataProvider>
        <OcrQueueProvider>
          <CurrentUserProvider>
            <RouterProvider router={router} />
          </CurrentUserProvider>
        </OcrQueueProvider>
      </DataProvider>
    </ThemeProvider>
  );
}
