// Avoid using @types/audioworklet here because it has at least two problems.
// 1. It conflicts type definitions in DOM library. 
// 2. Missing options argument of AudioWorkletProcessor.new

import { WaveBuffer } from "../wave-buffer";

// https://github.com/microsoft/TypeScript/issues/28308
type AudioWorkletProcessorType = {
  readonly port: MessagePort;
  process(inputs: Float32Array[][], outputs: Float32Array[][], parameters?: Record<string, Float32Array>): boolean;
};

declare const AudioWorkletProcessor: {
  prototype: AudioWorkletProcessorType;
  new(options?: AudioWorkletNodeOptions): AudioWorkletProcessorType;
};

type ProcessorCtor = (new (options?: AudioWorkletNodeOptions) => AudioWorkletProcessorType);
declare function registerProcessor(name: string, ctor: ProcessorCtor): void;

export type StreamerWorkletState = 'initial' | 'playing' | 'paused' | 'stopped' | 'disposed';

export type StreamerWorkletRequestType = 'play' | 'seek' | 'pause' | 'resume' | 'stop' | 'dispose';

export type StreamerWorkletRequest = {
  type: StreamerWorkletRequestType;
  inputPort?: MessagePort;
  seekPos?: number;
};

export type StreamerWorkletRequestWithSeq = { seq: number; } & StreamerWorkletRequest;

export type StreamerWorkletResponse = {
  seq: number;
  type: StreamerWorkletRequestType;
  data?: any;
  error?: any;
};

export class StreamerWorkletProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [];
  }

  constructor(options: any) {
    super(options);
    this.port.onmessage = async (ev) => {
      let res: StreamerWorkletResponse;
      const req = ev.data as StreamerWorkletRequestWithSeq;
      try {
        const data = await this._onCommand(req);
        res = { seq: req.seq, type: req.type, data: data };
      } catch (e) {
        res = { seq: req.seq, type: req.type, error: e };
      }
      this.port.postMessage(res);
    }
  }

  private _inputPort: MessagePort | null = null;

  private _buffer: WaveBuffer = new WaveBuffer();

  _reset() {
    this._buffer.clear();
    if (this._inputPort != null) {
      this._inputPort.onmessage = null;
      this._inputPort.close();
      this._inputPort = null;
    }
  }

  private _state: StreamerWorkletState = 'initial';

  _setState(state: StreamerWorkletState) {
    console.log(`StreamerWorkletProcessor: ${state}`);
    this._state = state;
    this.port.postMessage({ type: 'state', state: state });
  }

  async _onCommand(cmd: StreamerWorkletRequest): Promise<any> {
    console.log(cmd.type);
    switch (cmd.type) {
      case 'play':
        if (this._state != 'disposed') {
          this._reset();
          this._inputPort = cmd.inputPort!;
          this._inputPort!.onmessage = (ev) => this._buffer.write(ev.data);
          this._setState('playing');
        } else {
          console.error('Streamer worklet cannot be used after being disposed.');
        }
        return;
      case 'pause':
        if (this._state == 'playing') {
          this._setState('paused');
        }
        return;
      case 'seek':
        this._buffer.seekTo(cmd.seekPos!);
        return;
      case 'resume':
        if (this._state == 'paused') {
          this._setState('playing');
        }
        return;
      case 'stop':
        this._reset();
        this._setState('stopped');
        return;
      case 'dispose':
        this._reset();
        this.port.onmessage = null;
        this._setState('disposed');
        // this.port.close();
        return;
    }
  }

  process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    if (this._state == 'disposed') {
      return false;
    }
    if (this._state == 'playing') {
      this._buffer.onAudioWorkletProcess(inputs, outputs);
      this.port.postMessage({
        type: 'progress',
        stat: this._buffer.stat,
      });
    }
    return true;
  }
}

export function runAudioWorklet(name: string, ctor: ProcessorCtor) {
  registerProcessor(name, ctor);
}