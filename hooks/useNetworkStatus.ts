"use client";

import { useState, useEffect, useRef } from 'react';

export type ConnectionQuality = 'good' | 'poor' | 'offline';

export function useNetworkStatus(wsTeacherRef?: React.MutableRefObject<WebSocket | null>) {
  const [isOnline, setIsOnline] = useState(true);
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>('good');
  const [networkType, setNetworkType] = useState<string>('4g');
  const [pingMs, setPingMs] = useState<number | null>(null);
  const isPingingRef = useRef(false);
  const consecutiveSlowCountRef = useRef(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let isMounted = true;

    const performPing = async () => {
      if (isPingingRef.current) return;
      isPingingRef.current = true;

      const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!online) {
        if (isMounted) {
          consecutiveSlowCountRef.current = 0;
          setIsOnline(false);
          setConnectionQuality('offline');
          setPingMs(null);
        }
        isPingingRef.current = false;
        return;
      }

      // Check browser Connection API for immediate hint
      const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      if (conn && conn.effectiveType) {
        setNetworkType(conn.effectiveType);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const startTime = performance.now();

      try {
        const res = await fetch('/api/ping', {
          method: 'HEAD',
          cache: 'no-store',
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        const latency = Math.round(performance.now() - startTime);

        if (!isMounted) return;

        const isSuccess = res.ok || res.status === 204 || res.status === 200;

        setIsOnline(true);
        setPingMs(latency);

        // Robust network classification:
        // Standard cloud latency across regions (e.g. Asia to US/EU edge) is 100ms-400ms.
        // We only consider a ping "slow" if it exceeds 550ms, fails, or browser is explicitly on slow-2g.
        // To avoid false positives from transient jitter, require 3 consecutive slow checks before marking 'poor'.
        const isSlowSample = !isSuccess || latency > 550 || (conn && conn.effectiveType === 'slow-2g');

        if (isSlowSample) {
          consecutiveSlowCountRef.current += 1;
          if (consecutiveSlowCountRef.current >= 3) {
            setConnectionQuality('poor');
          }
        } else {
          // A single healthy ping immediately resets the counter and restores 'good' status
          consecutiveSlowCountRef.current = 0;
          setConnectionQuality('good');
        }
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (!isMounted) return;

        if (!navigator.onLine) {
          consecutiveSlowCountRef.current = 0;
          setIsOnline(false);
          setConnectionQuality('offline');
          setPingMs(null);
        } else {
          // Timeout reached while navigator claims online -> slow network debounce
          consecutiveSlowCountRef.current += 1;
          if (consecutiveSlowCountRef.current >= 3) {
            setIsOnline(true);
            setConnectionQuality('poor');
            setPingMs(4000);
          }
        }
      } finally {
        isPingingRef.current = false;
      }
    };

    // Immediate ping on mount
    performPing();

    const handleOffline = () => {
      consecutiveSlowCountRef.current = 0;
      setIsOnline(false);
      setConnectionQuality('offline');
      setPingMs(null);
    };

    const handleOnline = () => {
      setIsOnline(true);
      performPing();
    };

    const handleFocus = () => {
      performPing();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('focus', handleFocus);

    const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (conn) {
      conn.addEventListener('change', performPing);
    }

    // Ping check every 5.0s to remain responsive without edge invocation thrashing
    const interval = setInterval(performPing, 5000);

    return () => {
      isMounted = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('focus', handleFocus);
      if (conn) {
        conn.removeEventListener('change', performPing);
      }
      clearInterval(interval);
    };
  }, [wsTeacherRef]);

  return { isOnline, connectionQuality, networkType, pingMs };
}

