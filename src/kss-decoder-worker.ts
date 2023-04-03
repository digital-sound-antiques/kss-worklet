import { KSS, KSSPlay } from "libkss-js";
import { AudioDecoderWorker } from "webaudio-stream-player";

export type KSSDecoderStartOptions = {
  data: Uint8Array | ArrayBuffer | ArrayBufferLike | ArrayLike<number>;
  label?: string;
  song?: number;
  cpu?: number;
  duration?: number | null;
  fadeDuration?: number | null;
  rcf?: null | {
    resistor: number;
    capacitor: number;
  };
  debug?: boolean | null;
  loop?: number | null;
};

export type KSSDecoderDeviceSnapshot = {
  frame: number;
  psg?: Uint8Array | null;
  scc?: Uint8Array | null;
  opll?: Uint8Array | null;
  opl?: Uint8Array | null;
};

class KSSDecoderWorker extends AudioDecoderWorker {
  constructor(worker: Worker) {
    super(worker);
  }

  private _kss: KSS | null = null;
  private _kssplay: KSSPlay | null = null;
  private _maxDuration = 60 * 1000 * 5;
  private _fadeDuration = 5 * 1000;
  private _decodeFrames = 0;
  private _maxLoop = 2;
  private _hasDebugMarker = false;

  async init(args: any): Promise<void> {
    await KSSPlay.initialize();
    console.debug("KSSPlay.initialized");
  }

  async start(args: KSSDecoderStartOptions): Promise<void> {
    if (args.data instanceof Uint8Array) {
      this._kss = new KSS(args.data, args.label ?? "");
    } else if (args.data instanceof ArrayBuffer) {
      const u8a = new Uint8Array(args.data);
      this._kss = new KSS(u8a, args.label ?? "");
    } else {
      throw new Error(`Invalid data type=${typeof args.data}`);
    }

    if (this._kssplay == null) {
      this._kssplay = new KSSPlay(this.sampleRate);
    }

    this._kssplay.setData(this._kss);
    this._kssplay.setDeviceQuality({ psg: 1, opll: 1, scc: 0, opl: 1 });
    this._kssplay.reset(args.song ?? 0, args.cpu ?? 0);
    if (args.rcf != null) {
      this._kssplay.setRCF(args.rcf.resistor, args.rcf.capacitor);
    } else {
      this._kssplay.setRCF(0, 0);
    }

    this._fadeDuration = args.fadeDuration ?? this._fadeDuration;
    this._maxDuration = args.duration ?? this._maxDuration;
    this._hasDebugMarker = args.debug ?? false;
    this._maxLoop = args.loop ?? this._maxLoop;
    this._decodeFrames = 0;
  }

  _skipToDebugMarker() {
    if (this._kssplay == null) return;

    const interval = Math.floor(this.sampleRate / 60);
    const maxTick = (this.sampleRate * this._maxDuration) / 1000;
    let tick = 0;
    while (tick <= maxTick) {
      this._kssplay!.calcSilent(interval);
      const jumpct = this._kssplay!.getMGSJumpCount();
      if (jumpct != 0) {
        break;
      }
      tick += interval;
    }
  }

  async process(): Promise<Array<Int16Array> | null> {
    if (this._kssplay == null) return null;

    if (this._hasDebugMarker) {
      this._skipToDebugMarker();
    }

    if (this._kssplay.getFadeFlag() == 2 || this._kssplay.getStopFlag() != 0) {
      return null;
    }

    const currentTimeInMs = (this._decodeFrames / this.sampleRate) * 1000;

    if (
      this._kssplay.getLoopCount() >= this._maxLoop ||
      this._maxDuration - this._fadeDuration <= currentTimeInMs
    ) {
      if (this._kssplay.getFadeFlag() == 0) {
        this._kssplay.fadeStart(this._fadeDuration);
      }
    }

    if (this._maxDuration < currentTimeInMs) {
      return null;
    }

    const res = new Int16Array(this.sampleRate);
    const step = this.sampleRate / 60;

    for (let t = 0; t < this.sampleRate; t += step) {
      this._decodeFrames += step;
      res.set(this._kssplay.calc(step), t);
      this.worker.postMessage({
        type: "snapshots",
        data: [
          {
            frame: this._decodeFrames,
            psg: this._kssplay.readDeviceRegs("psg"),
            scc: this._kssplay.readDeviceRegs("scc"),
            opll: this._kssplay.readDeviceRegs("opll"),
          },
        ],
      });
    }

    return [res];
  }

  async abort(): Promise<void> {
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

console.log("kss-decoder-worker");

/* `self as any` is workaround. See: [issue#20595](https://github.com/microsoft/TypeScript/issues/20595) */
const decoder = new KSSDecoderWorker(self as any);
