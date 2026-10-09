import { useCallback, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import AppRoutes from './routes/AppRoutes';
import SplashScreen from './components/brand/SplashScreen';

const SPLASH_KEY = 'bcc_splash_shown';

// The intro plays once per browser tab session, so it greets the user when
// they open the software but doesn't replay on every refresh. The app keeps
// loading underneath while it runs, so it never adds to the wait.
const shouldShowSplash = () => {
  try {
    return !sessionStorage.getItem(SPLASH_KEY);
  } catch {
    return true;
  }
};

function App() {
  const [showSplash, setShowSplash] = useState(shouldShowSplash);

  const finishSplash = useCallback(() => {
    try {
      sessionStorage.setItem(SPLASH_KEY, '1');
    } catch {
      /* private mode */
    }
    setShowSplash(false);
  }, []);

  return (
    <>
      <AppRoutes />
      <AnimatePresence>{showSplash && <SplashScreen key="splash" onDone={finishSplash} />}</AnimatePresence>
    </>
  );
}

export default App;
