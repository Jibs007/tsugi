import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Scrolls back to the top on every route change. Without this, navigating
 * e.g. from the bottom of one anime detail page to a related anime keeps
 * the old scroll position. Targets both the window and the app's internal
 * scroll container.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    document.getElementById('main-scroll')?.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
