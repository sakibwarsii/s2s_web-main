"use client";

import { useState, useEffect, useRef } from 'react';

export type ConnectionQuality = 'good' | 'poor' | 'offline';

export function useNetworkStatus(wsTeacherRef?: React.MutableRefObject<WebSocket | null>) {
  const [isOnline, setIsOnline] = useState(true);
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>('good');
  const [networkType, setNetworkType] = useState<string>('4g');
  const [pingMs, setPingMs] = useState<number | null>(null);
  const isPingingRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let isMounted = true;

    const performPing = async () => {
      if (isPingingRef.current) return;
      isPingingRef.current = true;

      const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!online) {
        if (isMounted) {
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
      const timeoutId = setTimeout(() => controller.abort(), 2500);
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

        if (!res.ok && res.status !== 204) {
          // If ping endpoint returned an error, check if connection is poor
          setConnectionQuality('poor');
          setPingMs(latency);
          return;
        }

        setIsOnline(true);
        setPingMs(latency);

        // Instant classification:
        // - Good: latency < 250ms and not 2g/slow-2g
        // - Poor (Slow Network): latency >= 250ms, or browser reports 2g/slow-2g or conn.rtt > 300
        const isBrowserReportingSlow = conn && (
          conn.effectiveType === 'slow-2g' ||
          conn.effectiveType === '2g' ||
          (conn.rtt && conn.rtt > 300)
        );

        if (latency >= 250 || isBrowserReportingSlow) {
          setConnectionQuality('poor');
        } else {
          setConnectionQuality('good');
        }
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (!isMounted) return;

        // If fetch failed or aborted, determine if totally offline or severely degraded
        if (!navigator.onLine || err.name === 'AbortError') {
          if (!navigator.onLine) {
            setIsOnline(false);
            setConnectionQuality('offline');
            setPingMs(null);
          } else {
            // Timeout reached (2500ms) while navigator thinks it's online -> severely slow network
            setIsOnline(true);
            setConnectionQuality('poor');
            setPingMs(2500);
          }
        } else {
          setIsOnline(false);
          setConnectionQuality('offline');
          setPingMs(null);
        }
      } finally {
        isPingingRef.current = false;
      }
    };

    // Immediate ping on mount
    performPing();

    const handleOffline = () => {
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

    // High frequency active check every 2.0s for instant detection
    const interval = setInterval(performPing, 2000);

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

