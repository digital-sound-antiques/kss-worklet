import { KSS, KSSPlay } from 'libkss-js';
import { AudioDecoderWorker } from './decoder-worker';

export type KSSDecoderStartOptions = {
  data: Uint8Array | ArrayBuffer | ArrayBufferLike | ArrayLike<number>;
  label?: string;
  song?: number,
  cpu?: number,
  duration?: number | null,
  sampleRate?: number | null,
  fadeDuration?: number | null,
};

class KSSDecoderWorker extends AudioDecoderWorker {
  constructor(worker: Worker) {
    super(worker);
  }

  private _kss: KSS | null = null;
  private _kssplay: KSSPlay | null = null;
  private _maxDuration: number = 60 * 1000 * 5;
  private _sampleRate: number = 44100;
  private _fadeDuration: number = 5 * 1000;
  private _tick: number = 0;

  async init(): Promise<void> {
    await KSSPlay.initialize();
    console.log('KSSPlay.initialized');
  }

  async start(args: KSSDecoderStartOptions): Promise<void> {
    const options = args as KSSDecoderStartOptions;
    this._sampleRate = options.sampleRate ?? 44100;

    let data: Uint8Array;
    if (options.data instanceof Uint8Array) {
      data = options.data;
    } else {
      data = new Uint8Array(options.data);
    }

    this._kss = new KSS(data, options.label ?? "");

    if (this._kssplay == null) {
      this._kssplay = new KSSPlay(this._sampleRate);
    }

    this._kssplay.setData(this._kss);
    this._kssplay.setDeviceQuality({ psg: 1, opll: 1, scc: 0, opl: 1 });
    this._kssplay.reset(options.song ?? 0, options.cpu ?? 0);
    this._fadeDuration = options.fadeDuration ?? this._fadeDuration;
    this._maxDuration = options.duration ?? this._maxDuration;
    this._tick = 0;
  }

  async process(): Promise<Int16Array | null> {
    if (this._kssplay?.getFadeFlag() == 2 || this._kssplay?.getStopFlag() != 0) {
      return null;
    }

    const time = this._tick * 1000 / 4;

    if (this._kssplay?.getLoopCount() >= 2 || this._maxDuration - this._fadeDuration < time) {
      if (this._kssplay?.getFadeFlag() == 0) {
        this._kssplay?.fadeStart(this._fadeDuration);
      }
    }

    if (this._maxDuration < time) {
      return null;
    }

    this._tick++;
    return this._kssplay!.calc(this._sampleRate >> 2);
  }

  async stop(): Promise<void> {
    this._kss?.release();
    this._kss = null;
  }

  async dispose(): Promise<void> {
    this._kssplay?.release();
    this._kssplay = null;
    this._kss?.release();
    this._kss = null;
  }
}

/* `self as any` is workaround. See: [issue#20595](https://github.com/microsoft/TypeScript/issues/20595) */
const worker: Worker = self as any;
const decoder = new KSSDecoderWorker(worker);
