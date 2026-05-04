import { API_BASE } from '../api/client';

const DEFAULT_ENDPOINT = API_BASE + '/api/observability/client-metrics';
const METRICS_ENDPOINT = import.meta.env.VITE_CLIENT_METRICS_URL || DEFAULT_ENDPOINT;
let installed = false;

type TimedEntry = PerformanceEntry & {
  renderTime?: number;
  loadTime?: number;
};

function reportClientMetric(name: string, value: number) {
  if (!Number.isFinite(value) || value < 0) return;

  const payload = JSON.stringify({
    name,
    value,
    path: window.location.pathname,
  });

  if (navigator.sendBeacon) {
    const body = new Blob([payload], { type: 'application/json' });
    if (navigator.sendBeacon(METRICS_ENDPOINT, body)) return;
  }

  fetch(METRICS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    credentials: 'include',
    keepalive: true,
  }).catch(() => {});
}

function observePerformanceEntries(type: string, onEntry: (entry: TimedEntry) => void) {
  if (!('PerformanceObserver' in window)) return;
  if (!PerformanceObserver.supportedEntryTypes.includes(type)) return;

  try {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => onEntry(entry as TimedEntry));
    });
    observer.observe({ type, buffered: true });
  } catch {
    // Older browsers may expose PerformanceObserver without buffered support.
  }
}

export function installPerformanceMetrics() {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  window.addEventListener('load', () => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (!navigation) return;

    reportClientMetric('client_load_time', navigation.loadEventEnd - navigation.startTime);
    reportClientMetric('dom_content_loaded', navigation.domContentLoadedEventEnd - navigation.startTime);
  }, { once: true });

  observePerformanceEntries('paint', (entry) => {
    if (entry.name === 'first-contentful-paint') {
      reportClientMetric('first_contentful_paint', entry.startTime);
    }
  });

  observePerformanceEntries('largest-contentful-paint', (entry) => {
    reportClientMetric('largest_contentful_paint', entry.renderTime || entry.loadTime || entry.startTime);
  });
}
