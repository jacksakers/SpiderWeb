import { useEffect } from 'react';
import MetaBrowser from './components/browser/MetaBrowser';
import { useAuthStore } from './store/authStore';

function App() {
  const initAuth = useAuthStore((s) => s.initAuth);

  useEffect(() => {
    // Start Firebase auth listener.
    // Hash routing is handled by tabStore initialisation (reads window.location.hash
    // synchronously at module load, before any effects can clear it).
    initAuth();
  }, []);

  return <MetaBrowser />;
}

export default App;
