import type { AsyncDuckDB, AsyncDuckDBConnection } from "@duckdb/duckdb-wasm";
import ehWorkerUrl from "@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url";
import mvpWorkerUrl from "@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url";

type Session = {
  controller: AbortController;
  ready: Promise<AsyncDuckDB>;
};

export function createDuckDB(onFailure: (error: Error) => void) {
  let session: Session | undefined;

  function stop(controller: AbortController, reason?: Error) {
    const isCurrent = session?.controller === controller;
    if (isCurrent) session = undefined;
    controller.abort(reason);
    if (isCurrent && reason) onFailure(reason);
  }

  async function start(controller: AbortController) {
    const { signal } = controller;
    const { AsyncDuckDB, getJsDelivrBundles, selectBundle, VoidLogger } =
      await import("@duckdb/duckdb-wasm");

    // The version-matched Wasm files exceed Cloudflare's static asset size limit.
    const { mvp, eh } = getJsDelivrBundles();
    const bundle = await selectBundle({
      mvp: { ...mvp, mainWorker: mvpWorkerUrl },
      eh: eh && { ...eh, mainWorker: ehWorkerUrl },
    });
    signal.throwIfAborted();

    if (!bundle.mainWorker) {
      throw new Error("DuckDB could not start in this browser.");
    }

    const worker = new Worker(bundle.mainWorker);
    const database = new AsyncDuckDB(new VoidLogger(), worker);
    const onWorkerError = () => {
      stop(
        controller,
        new Error("The data worker stopped. Open a CSV to try again."),
      );
    };
    worker.addEventListener("error", onWorkerError);
    signal.addEventListener(
      "abort",
      () => {
        worker.removeEventListener("error", onWorkerError);
        database.detach();
        worker.terminate();
      },
      { once: true },
    );

    await database.instantiate(bundle.mainModule);
    return database;
  }

  function getSession() {
    if (session) return session;

    const controller = new AbortController();
    const ready = start(controller).catch((cause) => {
      if (!controller.signal.aborted) {
        stop(
          controller,
          new Error(
            "Could not start DuckDB. Check your connection and try again.",
            { cause },
          ),
        );
      }
      throw controller.signal.reason;
    });
    session = { controller, ready };
    return session;
  }

  async function withConnection<T>(
    work: (
      connection: AsyncDuckDBConnection,
      database: AsyncDuckDB,
    ) => Promise<T>,
  ): Promise<T> {
    const { controller, ready } = getSession();
    const { signal } = controller;

    async function run() {
      const database = await ready;
      signal.throwIfAborted();
      const connection = await database.connect();

      try {
        signal.throwIfAborted();
        return await work(connection, database);
      } finally {
        if (!signal.aborted) {
          try {
            await connection.close();
          } catch (cause) {
            stop(
              controller,
              new Error("The data worker stopped. Open a CSV to try again.", {
                cause,
              }),
            );
          }
        }
      }
    }

    // A terminated DuckDB worker can leave an outstanding RPC promise pending.
    let onAbort: (() => void) | undefined;
    const stopped = new Promise<never>((_, reject) => {
      onAbort = () => reject(signal.reason);
      signal.addEventListener("abort", onAbort, { once: true });
    });

    try {
      return await Promise.race([run(), stopped]);
    } finally {
      if (onAbort) signal.removeEventListener("abort", onAbort);
    }
  }

  return {
    withConnection,
    dispose() {
      if (session) stop(session.controller);
    },
  };
}

export type DuckDBEngine = ReturnType<typeof createDuckDB>;
