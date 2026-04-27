import { MultiBar, Presets, type SingleBar } from 'cli-progress';
import path from 'node:path';
import readline from 'node:readline';

type RestoreFetchLogger = () => void;

type UploadSessionOptions = {
  scenarioName: string;
  filePath: string;
  totalBytes: number;
};

type UploadSession = {
  signal: AbortSignal;
  complete: () => void;
  fail: (message?: string) => void;
  wasCanceled: () => boolean;
  dispose: () => void;
};

type UploadFetchLogger = {
  restore: RestoreFetchLogger;
  startUploadSession: (options: UploadSessionOptions) => UploadSession;
};

type ParsedContentRange = {
  startByte: number;
  endByte: number;
  totalBytes: number;
};

const BAR_WIDTH = 28;
const FRAME_INTERVAL = 120;
const SPINNER_FRAMES = ['|', '/', '-', '\\'];

const getBodyKind = (body: BodyInit | null | undefined) => {
  if (body === undefined || body === null) return 'empty';
  if (typeof body === 'string') return 'string';
  if (body instanceof Uint8Array) return 'uint8array';
  if (body instanceof ArrayBuffer) return 'arraybuffer';
  if (typeof Blob !== 'undefined' && body instanceof Blob) return 'blob';
  if (typeof FormData !== 'undefined' && body instanceof FormData) {
    return 'form-data';
  }
  if (typeof ReadableStream !== 'undefined' && body instanceof ReadableStream) {
    return 'readable-stream';
  }
  return 'unknown';
};

const getBodySize = (body: BodyInit | null | undefined) => {
  if (body === undefined || body === null) return undefined;
  if (typeof body === 'string') return Buffer.byteLength(body);
  if (body instanceof Uint8Array) return body.byteLength;
  if (body instanceof ArrayBuffer) return body.byteLength;
  if (typeof Blob !== 'undefined' && body instanceof Blob) return body.size;
  return undefined;
};

const mergeHeaders = (input: RequestInfo | URL, init?: RequestInit) => {
  const headers = new Headers(
    input instanceof Request ? input.headers : undefined,
  );

  new Headers(init?.headers).forEach((value, key) => {
    headers.set(key, value);
  });

  return headers;
};

const isUploadRequest = (
  method: string,
  url: string,
  headers: Headers,
  body: BodyInit | null | undefined,
) => {
  if (headers.has('Content-Range')) return true;
  if (headers.has('X-Uploading-Mode')) return true;

  return (
    method.toUpperCase() === 'POST' &&
    body !== undefined &&
    body !== null &&
    url.toLowerCase().includes('/uploads')
  );
};

const parseContentRange = (
  value: string | null,
): ParsedContentRange | undefined => {
  if (!value) return undefined;

  const match = /^bytes\s+(\d+)-(\d+)\/(\d+)$/.exec(value.trim());

  if (!match) return undefined;

  return {
    startByte: Number(match[1]),
    endByte: Number(match[2]),
    totalBytes: Number(match[3]),
  };
};

const formatBytes = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return '0 B';
  if (value < 1024) return `${value} B`;

  const units = ['KB', 'MB', 'GB', 'TB'];
  let size = value / 1024;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
};

const buildStaticBar = (progress: number) => {
  const normalized = Math.min(Math.max(progress, 0), 1);
  const completeSize = Math.round(normalized * BAR_WIDTH);
  const incompleteSize = BAR_WIDTH - completeSize;

  return `${'#'.repeat(completeSize)}${'-'.repeat(incompleteSize)}`;
};

const combineSignals = (
  signals: Array<AbortSignal | undefined>,
): AbortSignal | undefined => {
  const validSignals = signals.filter(
    (signal): signal is AbortSignal => signal !== undefined,
  );

  if (validSignals.length === 0) {
    return undefined;
  }

  if (validSignals.length === 1) {
    return validSignals[0];
  }

  if (typeof AbortSignal.any === 'function') {
    return AbortSignal.any(validSignals);
  }

  const controller = new AbortController();

  for (const signal of validSignals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      return controller.signal;
    }

    signal.addEventListener(
      'abort',
      () => {
        controller.abort(signal.reason);
      },
      { once: true },
    );
  }

  return controller.signal;
};

class ProgressRenderer {
  private multiBar?: MultiBar;

  private createMultiBar() {
    return new MultiBar(
      {
        hideCursor: true,
        clearOnComplete: true,
        stopOnComplete: false,
        linewrap: false,
        fps: 12,
        barsize: BAR_WIDTH,
        stream: process.stdout,
        format:
          '[{bar}] {percentage}% | {transferred}/{size} | mode={mode} | req={requests} | {spinner} {stage}',
      },
      Presets.shades_grey,
    );
  }

  createBar(totalBytes: number) {
    if (!process.stdout.isTTY) {
      return undefined;
    }

    this.stop();
    this.multiBar = this.createMultiBar();

    return this.multiBar.create(Math.max(totalBytes, 1), 0, {
      transferred: formatBytes(0),
      size: formatBytes(totalBytes),
      mode: 'wait',
      requests: 0,
      spinner: SPINNER_FRAMES[0],
      stage: 'готово к запуску',
    });
  }

  log(line: string) {
    if (this.multiBar) {
      this.multiBar.log(`${line}\n`);
      return;
    }

    console.log(line);
  }

  stop() {
    this.multiBar?.stop();
    this.multiBar = undefined;
  }
}

class ConsoleUploadSession implements UploadSession {
  readonly signal: AbortSignal;

  private readonly controller = new AbortController();

  private readonly stdin = process.stdin;

  private readonly bar?: SingleBar;

  private readonly totalBytes: number;

  private readonly label: string;

  private frameIndex = 0;

  private transferredBytes = 0;

  private requestCount = 0;

  private requestInFlight = 0;

  private mode = 'wait';

  private lastStage = 'готово к запуску';

  private completed = false;

  private canceled = false;

  private enabledRawMode = false;

  private animationTimer?: NodeJS.Timeout;

  constructor(
    private readonly options: UploadSessionOptions,
    private readonly renderer: ProgressRenderer,
  ) {
    this.signal = this.controller.signal;
    this.totalBytes = Math.max(options.totalBytes, 1);
    this.label = `${options.scenarioName}:${path.basename(options.filePath)}`;
    this.bar = this.renderer.createBar(this.totalBytes);

    if (this.bar) {
      this.startAnimation();
      this.syncBar();
    }

    this.attachEscHandler();
  }

  onRequestStart({
    bodyKind,
    bodySize,
    contentRange,
  }: {
    bodyKind: string;
    bodySize?: number;
    contentRange?: ParsedContentRange;
  }) {
    this.requestCount += 1;
    this.requestInFlight += 1;

    if (contentRange) {
      this.mode = 'chunked';
      this.lastStage = [
        `чанк ${this.requestCount}`,
        `${formatBytes(contentRange.startByte)}-${formatBytes(contentRange.endByte + 1)}`,
        `из ${formatBytes(contentRange.totalBytes)}`,
      ].join(' | ');
    } else {
      this.mode = bodyKind === 'form-data' ? 'multipart' : bodyKind;
      this.lastStage = bodySize
        ? `запрос ${this.requestCount} | ${formatBytes(bodySize)}`
        : `запрос ${this.requestCount}`;
    }

    this.syncBar();
  }

  onRequestDone({
    bodySize,
    contentRange,
    status,
  }: {
    bodySize?: number;
    contentRange?: ParsedContentRange;
    status: number;
  }) {
    this.requestInFlight = Math.max(0, this.requestInFlight - 1);

    if (contentRange) {
      this.transferredBytes = Math.max(
        this.transferredBytes,
        contentRange.endByte + 1,
      );
    } else {
      this.transferredBytes = this.options.totalBytes;
      if (bodySize && this.options.totalBytes > 0) {
        this.transferredBytes = Math.max(this.transferredBytes, bodySize);
      }
    }

    this.lastStage = `ответ ${status} | завершено запросов: ${this.requestCount}`;
    this.syncBar();
  }

  onRequestError(message: string) {
    this.requestInFlight = Math.max(0, this.requestInFlight - 1);
    this.lastStage = message;
    this.syncBar();
  }

  complete = () => {
    this.completed = true;
    this.transferredBytes = this.options.totalBytes;
    this.lastStage = 'загрузка завершена';
    this.syncBar();
    this.detach(this.buildFinalSnapshot('done'));
  };

  fail = (message = 'загрузка завершилась ошибкой') => {
    this.completed = true;
    this.lastStage = message;
    this.syncBar();
    this.detach(this.buildFinalSnapshot(this.canceled ? 'cancel' : 'fail'));
  };

  wasCanceled = () => this.canceled;

  dispose = () => {
    if (!this.completed && !this.canceled) {
      this.lastStage = 'сессия завершена';
      this.syncBar();
      this.detach(this.buildFinalSnapshot('stop'));
      return;
    }

    this.detach();
  };

  private startAnimation() {
    this.animationTimer = setInterval(() => {
      this.frameIndex = (this.frameIndex + 1) % SPINNER_FRAMES.length;
      this.syncBar();
    }, FRAME_INTERVAL);

    this.animationTimer.unref?.();
  }

  private syncBar() {
    this.bar?.update(Math.min(this.totalBytes, this.transferredBytes), {
      transferred: formatBytes(this.transferredBytes),
      size: formatBytes(this.options.totalBytes),
      mode: this.mode,
      requests: this.requestCount,
      spinner: this.completed ? ' ' : SPINNER_FRAMES[this.frameIndex],
      stage: `${this.label} | ${this.lastStage}`,
    });
  }

  private buildFinalSnapshot(status: 'done' | 'fail' | 'cancel' | 'stop') {
    const progress =
      Math.min(this.totalBytes, this.transferredBytes) / this.totalBytes;
    const percent = `${Math.round(progress * 100)}%`;
    const bar = buildStaticBar(progress);

    return [
      `[${bar}]`,
      percent,
      `| ${formatBytes(this.transferredBytes)}/${formatBytes(this.options.totalBytes)}`,
      `| mode=${this.mode}`,
      `| req=${this.requestCount}`,
      `| status=${status}`,
      `| ${this.label} | ${this.lastStage}`,
    ].join(' ');
  }

  private abortByEsc() {
    if (this.canceled || this.completed) return;

    this.canceled = true;
    this.lastStage = 'прервано по Esc';
    this.syncBar();
    this.controller.abort(new Error('Upload canceled by ESC'));
    this.detach(this.buildFinalSnapshot('cancel'));
  }

  private attachEscHandler() {
    if (!this.stdin.isTTY) return;

    readline.emitKeypressEvents(this.stdin);

    if (!this.stdin.isRaw) {
      this.stdin.setRawMode(true);
      this.enabledRawMode = true;
    }

    this.stdin.on('keypress', this.handleKeypress);
    this.stdin.resume();
  }

  private detach(finalLine?: string) {
    if (this.animationTimer) {
      clearInterval(this.animationTimer);
      this.animationTimer = undefined;
    }

    if (this.stdin.isTTY) {
      this.stdin.off('keypress', this.handleKeypress);

      if (this.enabledRawMode) {
        this.stdin.setRawMode(false);
        this.enabledRawMode = false;
      }
    }

    this.renderer.stop();

    if (finalLine) {
      this.renderer.log(finalLine);
    }
  }

  private readonly handleKeypress = (
    _input: string,
    key: readline.Key | undefined,
  ) => {
    if (key?.ctrl && key.name === 'c') {
      process.kill(process.pid, 'SIGINT');
      return;
    }

    if (key?.name === 'escape') {
      this.abortByEsc();
    }
  };
}

export const installUploadFetchLogger = (): UploadFetchLogger => {
  const originalFetch = globalThis.fetch;
  const renderer = new ProgressRenderer();
  let currentSession: ConsoleUploadSession | undefined;

  globalThis.fetch = async (input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    const method =
      init?.method ?? (input instanceof Request ? input.method : 'GET');
    const headers = mergeHeaders(input, init);
    const body =
      init?.body ?? (input instanceof Request ? input.body : undefined);

    if (!isUploadRequest(method, url, headers, body)) {
      return originalFetch(input, init);
    }

    const bodyKind = getBodyKind(body);
    const bodySize = getBodySize(body);
    const contentRange = parseContentRange(headers.get('Content-Range'));

    const signal = combineSignals([
      init?.signal ?? (input instanceof Request ? input.signal : undefined),
      currentSession?.signal,
    ]);

    currentSession?.onRequestStart({
      bodyKind,
      bodySize,
      contentRange,
    });

    try {
      const response = await originalFetch(input, {
        ...init,
        method,
        signal,
      });

      currentSession?.onRequestDone({
        bodySize,
        contentRange,
        status: response.status,
      });

      return response;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown fetch error';

      currentSession?.onRequestError(message);
      throw error;
    }
  };

  return {
    startUploadSession: (options) => {
      currentSession?.dispose();
      const session = new ConsoleUploadSession(options, renderer);
      currentSession = session;

      return {
        signal: session.signal,
        complete: () => {
          session.complete();
          if (currentSession === session) {
            currentSession = undefined;
          }
        },
        fail: (message?: string) => {
          session.fail(message);
          if (currentSession === session) {
            currentSession = undefined;
          }
        },
        wasCanceled: () => session.wasCanceled(),
        dispose: () => {
          session.dispose();
          if (currentSession === session) {
            currentSession = undefined;
          }
        },
      };
    },
    restore: () => {
      currentSession?.dispose();
      currentSession = undefined;
      renderer.stop();
      globalThis.fetch = originalFetch;
    },
  };
};
