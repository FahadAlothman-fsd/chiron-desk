import { useEffect, useRef, useState } from "react";

export interface SSETickEvent {
  tick: number;
  ts: number;
}

type SSEStatus = "connecting" | "open" | "closed" | "error";

export function useSSE(url: string) {
  const [events, setEvents] = useState<SSETickEvent[]>([]);
  const [status, setStatus] = useState<SSEStatus>("connecting");
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource(url);
    esRef.current = es;

    es.onopen = () => setStatus("open");
    es.onerror = () => setStatus("error");

    es.addEventListener("tick", (e) => {
      const data = JSON.parse(e.data) as SSETickEvent;
      setEvents((prev) => [...prev, data]);
    });

    return () => {
      es.close();
      esRef.current = null;
      setStatus("closed");
    };
  }, [url]);

  return { events, status };
}
