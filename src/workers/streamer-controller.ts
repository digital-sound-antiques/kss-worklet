import { isChrome } from "../utils";
import { WaveBuffer } from "../wave-buffer";
import { StreamerWorkletRequest, StreamerWorkletResponse } from "./streamer-worklet-processor";

export interface StreamerController {
  get state(): StreamerState;
  onprogress: ((ev: StreamerProgress) => void) | null;
  onstatechange: ((ev: StreamerState) => void) | null;
  connect(destination: AudioNode): void;
  disconnect(): void;
  play(input: MessagePort): Promise<void>;
  seek(pos: number): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  stop(): Promise<void>;
  dispose(): Promise<void>;
}

export type StreamerState = 'initial' | 'playing' | 'paused' | 'stopped' | 'disposed';

export type StreamerProgress = {
  currentFrame: number;
  bufferedFrames: number;
  isClosed: boolean;
}

export class StreamerWorkletController implements StreamerController {
  private _node: AudioWorkletNode;

  _state: StreamerState = 'initial';

  constructor(audioContext: AudioContext, workletName: string) {
    this._node = new AudioWorkletNode(
      audioContext,
      workletName,
      {
        numberOfInputs: 0,
        numberOfOutputs: 1,
        outputChannelCount: [2],
        // parameterData: null,
        // processorOptions: null,
      }
    );
    this._node.port.onmessage = (ev) => this._handleMessage(ev);
  }

  _seq: number = 0;

  _completerMap: { [key: number]: (res: StreamerWorkletResponse) => void } = {};

  onprogress: ((ev: StreamerProgress) => void) | null = null;
  onstatechange: ((ev: StreamerState) => void) | null = null;

  setState(newState: StreamerState) {
    if (this._state != newState) {
      this._state = newState;
      if (this.onstatechange) {
        this.onstatechange(this._state);
      }
    }
  }

  get state() { return this._state; }

  _handleMessage(ev: MessageEvent): void {
    if (ev.data?.type == 'progress') {
      if (this.onprogress != null) {
        this.onprogress({ ...ev.data.stat });
      }
      return;
    }

    const seq = ev.data?.seq as number;
    if (seq != null) {
      const completer = this._completerMap[seq];
      delete this._completerMap[seq];
      completer(ev.data);
    }
  }

  private _request(req: StreamerWorkletRequest, transfer: Transferable[] = []): Promise<any> {
    const seq = this._seq++;
    this._node.port.postMessage({ seq, ...req }, transfer);
    const start = Date.now();
    return new Promise((resolve, reject) => {
      this._completerMap[seq] = (e) => {
        const elapsed = Date.now() - start;
        console.log(`WorkletController[${e.seq}]:${e.type} ${elapsed}ms`);
        if (e.error == null) {
          resolve(e.data);
        } else {
          reject(e.error!);
        }
      }
    });
  }

  connect(destination: AudioNode) { this._node.connect(destination); }
  disconnect() { this._node.disconnect(); }

  async play(input: MessagePort) {
    if (this._state == 'playing' || this._state == 'paused') {
      await this._request({ type: 'stop' });
    }
    const res = await this._request({ type: 'play', inputPort: input }, [input]);
    this.setState('playing');
  }

  async seek(pos: number): Promise<any> {
    return this._request({ type: 'seek', seekPos: pos });
  }

  async pause() {
    if (this._state == 'playing') {
      const res = await this._request({ type: 'pause' });
      this.setState('paused');
    }
  }

  async resume() {
    if (this._state == 'paused') {
      const res = await this._request({ type: 'resume' });
      this.setState('playing');
    }
  }

  async stop() {
    if (this._state != 'stopped') {
      const res = await this._request({ type: 'stop' });
      this.setState('stopped');
    }
  }

  async dispose(): Promise<void> {
    await this._request({ type: 'dispose' });
    this.setState('disposed');
    if (isChrome) {
      console.warn(`StreamerWorkletController.dispose: This operation may cause memory-leak on Chrome since Chrome will not release the AudioWorklet after the tied AudioContext is closed. See: https://bugs.chromium.org/p/chromium/issues/detail?id=1298955`);
    }
  };
}

export class StreamerScriptController implements StreamerController {

  private _node: ScriptProcessorNode;
  private _buffer: WaveBuffer = new WaveBuffer();
  private _inputPort: MessagePort | null = null;

  _state: StreamerState = 'initial';

  get state() { return this._state; }

  setState(newState: StreamerState): void {
    if (this._state != newState) {
      this._state = newState;
      if (this.onstatechange != null) {
        this.onstatechange(this._state);
      }
    }
  }

  onprogress: ((ev: StreamerProgress) => void) | null = null;
  onstatechange: ((ev: StreamerState) => void) | null = null;

  constructor(audioContext: AudioContext) {
    this._node = audioContext.createScriptProcessor(1024, 0, 2);
    this._node.onaudioprocess = (ev) => this._onAudioProcess(ev);
  }

  connect(destination: AudioNode) { this._node.connect(destination); }
  disconnect() { this._node.disconnect(); }

  async play(input: MessagePort) {
    if (this._state == 'initial' || this._state == 'stopped') {
      if (this._inputPort != null) {
        this._inputPort.onmessage = null;
        this._inputPort.close();
      }
      this._inputPort = input;
      this._inputPort.onmessage = (ev) => this._buffer.write(ev.data);
      this._buffer.clear();
      this.setState('playing');
    }
  }

  async seek(pos: number) {
    this._buffer.seekTo(pos);
  }

  async pause() {
    if (this._state == 'playing') {
      this.setState('paused');
    }
  }

  async resume() {
    if (this._state == 'paused') {
      this.setState('playing');
    }
  }

  async stop() {
    if (this._state == 'playing' || this._state == 'paused') {
      this.setState('stopped');
      this._buffer.clear();
    }
  }

  _onAudioProcess(ev: AudioProcessingEvent) {
    if (this._state == 'playing') {
      this._buffer.onAudioProcess(ev);
      if (this.onprogress != null) {
        this.onprogress(this._buffer.stat);
      }
    }
  }
  async dispose() {
    this._buffer.clear();
    if (this._inputPort != null) {
      this._inputPort.onmessage = null;
      this._inputPort.close();
      this._inputPort = null;
    }
    this._node.onaudioprocess = null;
    this.setState('disposed');
  }
}
