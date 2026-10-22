import { useContext } from 'react';
import { OcrQueueContext } from './OcrQueueContext';

export function useOcrQueue() {
  const context = useContext(OcrQueueContext);
  if (!context) throw new Error('useOcrQueue must be used inside <OcrQueueProvider>');
  return context;
}
