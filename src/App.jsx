import { useEffect } from 'react';
import MetaBrowser from './components/browser/MetaBrowser';
import { useAuthStore } from './store/authStore';
import { useTabStore } from './store/tabStore';

function App() {
  const initAuth   = useAuthStore((s) => s.initAuth);
  const navigateTo = useTabStore((s) => s.navigateTo);

  useEffect(() => {
    // Start Firebase auth listener
    initAuth();

    // If the app was opened via a shareable link (e.g. https://…/#mypage), load that page
    const hash = window.location.hash.replace(/^#/, '').trim();
    if (hash) navigateTo(hash, hash);
  }, []);

  return <MetaBrowser />;
}

export default App;
