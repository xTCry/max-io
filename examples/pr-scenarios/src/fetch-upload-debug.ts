import type { UploadProgress } from 'max-io';

import { MultiBar, Presets, type SingleBar } from 'cli-progress';
import path from 'node:path';
import readline from 'node:readline';

type UploadSessionOptions = {
  scenarioName: string;
  filePath: string;
  totalBytes: number;
};

type UploadConsoleSession = {
  signal: AbortSignal;
  onProgress: (progress: UploadProgress) => void;
  complete: () => void;
  fail: (message?: string) => void;
  wasCanceled: () => boolean;
  dispose: () => void;
};

const BAR_WIDTH = 25;
const FRAME_INTERVAL = 120;
const SPINNER_FRAMES = ['|', '/', '-', '\\'];

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
          '[{bar}] {percentage}% | {transferred}/{size} | mode={mode} | {spinner} {stage}',
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

class ConsoleUploadSession implements UploadConsoleSession {
  readonly signal: AbortSignal;

  private readonly controller = new AbortController();

  private readonly stdin = process.stdin;

  private readonly bar?: SingleBar;

  private readonly totalBytes: number;

  private readonly label: string;

  private frameIndex = 0;

  private transferredBytes = 0;

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

  onProgress = (progress: UploadProgress) => {
    this.mode = progress.mode;

    if (typeof progress.total === 'number' && progress.total > 0) {
      this.transferredBytes = Math.min(progress.loaded, progress.total);
    } else {
      this.transferredBytes = progress.loaded;
    }

    if (progress.phase === 'prepare') {
      this.lastStage = 'получен upload url';
    }

    if (progress.phase === 'upload') {
      this.lastStage =
        progress.mode === 'range'
          ? 'загрузка чанков'
          : 'multipart отправлен, ожидаю ответ';
    }

    if (progress.phase === 'complete') {
      this.lastStage = 'загрузка завершена';
    }

    this.syncBar();
  };

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

export const createUploadDebugSession = (
  options: UploadSessionOptions,
): UploadConsoleSession => {
  return new ConsoleUploadSession(options, new ProgressRenderer());
};
