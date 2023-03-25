export class WaveBuffer {

  private _waveBuffer = new ArrayBuffer(48000 * 1024 * Int16Array.BYTES_PER_ELEMENT);
  private _wave = new Int16Array(this._waveBuffer);
  private _rp = 0;
  private _wp = 0;

  isClosed: boolean = false;

  get currentFrame() { return this._rp; };
  get bufferedFrames() { return this._wp; };

  seekTo(frame: number): void {
    this._rp = frame;
  }

  clear() {
    this._wp = 0;
    this._rp = 0;
    this.isClosed = false;
  }

  get stat() {
    return { 
      currentFrame: this._rp, 
      bufferedFrames: this._wp, 
      isClosed: this.isClosed, 
    };
  };

  write(data: Int16Array | ArrayBuffer | null): void {
    if (data instanceof Int16Array) {
      const i16a = data as Int16Array;
      this._wave.set(i16a, this._wp);
      this._wp += i16a.length;
    } else if (data instanceof ArrayBuffer) {
      const i16a = new Int16Array(data);
      this._wave.set(i16a, this._wp);
      this._wp += i16a.length;
    } else if (data == null) {
      this.isClosed = true;
      console.log(`buffered: ${Math.floor(this._wp * 2 / 1024 / 1024)}MB`);
    } else {
      throw new Error(`Unknown payload type: ${typeof data}`);
    }
  }

  _processImpl(lch: Float32Array, rch: Float32Array | null, length: number) {
    if (this._rp + length <= this._wp) {
      for (let i = 0; i < lch.length; i++) {
        if (this._rp < this._wave.length) {
          lch[i] = this._wave[this._rp++] / (1 << 15);
          if (rch != null) {
            rch[i] = lch[i];
          }
        }
      }
    }
  }

  onAudioProcess(ev: AudioProcessingEvent): void {
    const length = ev.outputBuffer.length;
    const lch = ev.outputBuffer.getChannelData(0);
    const rch = ev.outputBuffer.length > 1 ? ev.outputBuffer.getChannelData(1) : null;
    this._processImpl(lch, rch, length);
  }

  onAudioWorkletProcess(inputs: Float32Array[][], outputs: Float32Array[][]): void {
    const output = outputs[0];
    const lch = output[0];
    const rch = output[1];
    this._processImpl(lch, rch, lch.length);
  }
}
