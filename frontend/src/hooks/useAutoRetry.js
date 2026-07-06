import { useEffect, useState } from 'react';

/**
 * When a query errors, retry it automatically on a schedule (default: three
 * attempts, 5s apart) before requiring a manual Retry click. Resets as soon
 * as the query recovers.
 *
 * Returns { retrying, retryNow }: `retrying` is true while automatic retries
 * are still scheduled; `retryNow` restarts the cycle from a button click.
 */
export function useAutoRetry(isError, refetch, delays = [5000, 5000, 5000]) {
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!isError) {
      setAttempt(0);
      return;
    }
    if (attempt >= delays.length) return;
    const id = setTimeout(() => {
      setAttempt((a) => a + 1);
      refetch();
    }, delays[attempt]);
    return () => clearTimeout(id);
  }, [isError, attempt]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    retrying: isError && attempt < delays.length,
    retryNow: () => { setAttempt(0); refetch(); },
  };
}
