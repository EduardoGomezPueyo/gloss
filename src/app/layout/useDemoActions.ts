import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useWorkspace } from '../workspace/WorkspaceContext';

/**
 * Load and leave the demo workspace (DECISIONS D34). Shared by the demo controls
 * under the avatar and the avatar menu of the collapsed sidebar.
 */
export function useDemoActions() {
  const navigate = useNavigate();
  const { kind, demo, loadDemo, exitDemo } = useWorkspace();
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const load = async () => {
    setLoading(true);
    setFailed(false);
    // Leave any page of the current workspace: its ids do not exist in the demo.
    await navigate('/projects');
    try {
      await loadDemo();
    } catch (error) {
      console.error('Could not load the demo', error);
      setFailed(true);
      setLoading(false);
    }
  };

  const exit = async () => {
    await navigate('/projects');
    exitDemo();
  };

  return { kind, demo, loading, failed, load, exit };
}
