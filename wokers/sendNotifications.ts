// src/workers/pingEndpointWorker.ts
import axios, { AxiosResponse } from "axios";

type WorkerConfig = {
  endpointUrl: string;
  intervalMs: number;
  timeoutMs: number;
};

type WorkerState = {
  isRunning: boolean;
  timer: NodeJS.Timeout | null;
};

const state: WorkerState = {
  isRunning: false,
  timer: null,
};

export function startSendNotificationsWorker(config: WorkerConfig): void {
  if (state.isRunning) return;

  state.isRunning = true;

  const tick = async (): Promise<void> => {
    try {
      console.log('Sending')
      const response: AxiosResponse = await axios.post(
        config.endpointUrl,
        {
        },
        {
        timeout: config.timeoutMs,
        headers: {
          "x-api-key": `${process.env.AUTH_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
      );

      // Optional: log status
      // console.log(`[worker] ping ok: ${response.status}`);
    } catch (err: unknown) {
      console.error("[worker] ping failed", err);
    }
  };

  // Run once immediately (optional). Remove if you want strictly each minute.
  void tick();

  state.timer = setInterval((): void => {
    void tick();
  }, config.intervalMs);

  // Avoid keeping the process alive if nothing else is running (optional)
  // state.timer.unref();
}
