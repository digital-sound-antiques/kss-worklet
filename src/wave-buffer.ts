export type WaveBufferStat = {
  currentFrame: number;
  currentTime: number;
  bufferedFrames: number;
  bufferedTime: number;
  isFulFilled: boolean;
}

export class WaveBuffer {

  constructor(sampleRate: number) {
    this._sampleRate = sampleRate;
    this._wave = new Int16Array(sampleRate * 60);
  }

  private _wave: Int16Array;
  private _sampleRate: number;
  private _rp = 0;
  private _wp = 0;

  isFulFilled: boolean = false;

  get currentFrame() { return this._rp; };
  get bufferedFrames() { return this._wp; };

  seekTo(frame: number, relative?: boolean | null): void {
    if (relative) {
      this._rp += frame;
    } else {
      this._rp = frame;
    }
    this._rp = Math.min(Math.max(0, this._rp), this._wp);
  }

  clear() {
    this._wave = new Int16Array(this._sampleRate * 60)
    this._wp = 0;
    this._rp = 0;
    this.isFulFilled = false;
  }

  get stat(): WaveBufferStat {
    return {
      currentFrame: this._rp,
      currentTime: Math.floor(this._rp / this._sampleRate * 1000),
      bufferedFrames: this._wp,
      bufferedTime: Math.floor(this._wp / this._sampleRate * 1000),
      isFulFilled: this.isFulFilled,
    };
  };

  _growAndWrite(data: Int16Array) {
    if (this._wp + data.length > this._wave.length) {
      const newWave = new Int16Array(this._wave.length * 2);
      newWave.set(this._wave);
      this._wave = newWave;
    }
    this._wave.set(data, this._wp);
    this._wp += data.length;
  }

  write(data: Int16Array | ArrayBuffer | null): void {
    if (data instanceof Int16Array) {
      this._growAndWrite(data as Int16Array);
    } else if (data instanceof ArrayBuffer) {
      this._growAndWrite(new Int16Array(data));
    } else if (data == null) {
      this.isFulFilled = true;
      console.log(`buffered: ${(this._wp * 2 / 1024 / 1024).toFixed(2)}MB`);
    } else {
      throw new Error(`Unknown payload type: ${typeof data}`);
    }
  }

  _processImpl(lch: Float32Array, rch: Float32Array | null, length: number): boolean {
    for (let i = 0; i < lch.length; i++) {
      if (this._rp < this._wp) {
        lch[i] = this._wave[this._rp++] / (1 << 15);
        if (rch != null) {
          rch[i] = lch[i];
        }
      }
    }

    if (this.isFulFilled && this._rp == this._wp) {
      return false;
    }
    return true;
  }

  onAudioProcess(ev: AudioProcessingEvent): boolean {
    const length = ev.outputBuffer.length;
    const lch = ev.outputBuffer.getChannelData(0);
    const rch = ev.outputBuffer.length > 1 ? ev.outputBuffer.getChannelData(1) : null;
    return this._processImpl(lch, rch, length);
  }

  onAudioWorkletProcess(inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const output = outputs[0];
    const lch = output[0];
    const rch = output[1];
    return this._processImpl(lch, rch, lch.length);
  }
}
