import { useEffect, useRef, useState } from "react";
import { Result } from "better-result";

export interface SSETickEvent {
  tick: number;
  ts: number;
}

export interface SSEEventMessage<TData> {
  event: string;
  data: TData;
  lastEventId: string;
}

type SSEStatus = "connecting" | "open" | "closed" | "error";

type UseSSEOptions<TData, TEvent> = {
  eventNames?: readonly string[];
  mapEvent?: (event: SSEEventMessage<TData>) => TEvent;
};

const defaultMapTickEvent = (event: SSEEventMessage<SSETickEvent>) => event.data;

export function useSSE<TData = SSETickEvent, TEvent = TData>(
  url: string | null,
  options?: UseSSEOptions<TData, TEvent>,
) {
  const [events, setEvents] = useState<TEvent[]>([]);
  const [status, setStatus] = useState<SSEStatus>(url ? "connecting" : "closed");
  const esRef = useRef<EventSource | null>(null);
  const eventNames = options?.eventNames ?? ["tick"];
  const mapEvent =
    options?.mapEvent ??
    (defaultMapTickEvent as unknown as (event: SSEEventMessage<TData>) => TEvent);
  const eventNamesRef = useRef(eventNames);
  const mapEventRef = useRef(mapEvent);

  useEffect(() => {
    eventNamesRef.current = eventNames;
  }, [eventNames]);

  useEffect(() => {
    mapEventRef.current = mapEvent;
  }, [mapEvent]);

  useEffect(() => {
    if (!url) {
      setEvents([]);
      setStatus("closed");
      return;
    }

    const es = new EventSource(url, { withCredentials: true });
    esRef.current = es;
    setEvents([]);
    setStatus("connecting");

    es.onopen = () => setStatus("open");
    es.onerror = () => setStatus("error");

    const listeners = eventNamesRef.current.map((eventName) => {
      const listener = (rawEvent: Event) => {
        if (!(rawEvent instanceof MessageEvent) || typeof rawEvent.data !== "string") {
          if (eventName === "error") {
            setStatus("error");
          }
          return;
        }

        const payload = rawEvent.data.trim();
        if (payload.length === 0 || payload === "undefined") {
          if (eventName === "error") {
            setStatus("error");
          }
          return;
        }

        const parsedData = Result.try({
          try: () => JSON.parse(payload) as TData,
          catch: () => undefined,
        });

        if (parsedData.isErr() || parsedData.value === undefined) {
          if (eventName === "error") {
            setStatus("error");
          }
          return;
        }

        setEvents((previous) => [
          ...previous,
          mapEventRef.current({
            event: eventName,
            data: parsedData.value,
            lastEventId: rawEvent.lastEventId,
          }),
        ]);
      };

      es.addEventListener(eventName, listener);
      return { eventName, listener };
    });

    return () => {
      for (const listener of listeners) {
        es.removeEventListener(listener.eventName, listener.listener);
      }
      es.close();
      esRef.current = null;
      setStatus("closed");
    };
  }, [url]);

  return { events, status };
}
