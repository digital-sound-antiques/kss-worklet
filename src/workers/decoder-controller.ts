import { AudioDecoderRequest, AudioDecoderResponse } from './decoder-worker';

export class AudioDecoderController {
  _worker: Worker | null;
  _seq: number = 0;

  constructor(worker: Worker) {
    this._worker = worker;
    this._worker.onmessage = (ev: MessageEvent) => this._handleMessage(ev);
  }

  _completerMap: { [key: number]: (res: AudioDecoderResponse) => void } = {};

  _handleMessage(ev: MessageEvent): void {
    const seq = ev.data?.seq as number;
    if (seq != null) {
      const completer = this._completerMap[seq];
      delete this._completerMap[seq];
      completer(ev.data);
    }
  }

  private _request(req: AudioDecoderRequest, transfer: Transferable[] = []): Promise<any> {
    const seq = this._seq++;
    const ts = Date.now();
    this._worker?.postMessage({ seq, ts, ...req }, transfer);
    const ts2 = Date.now();
    // console.log(`DecoderController req ${req.type}@${seq} ${ts2 - ts}ms`);
    return new Promise((resolve, reject) => {
      this._completerMap[seq] = (e) => {
        const elapsed = Date.now() - ts2;
        // console.log(`DecoderController res ${e.type}@${e.seq} ${elapsed}ms`);
        if (e.error == null) {
          resolve(e.data);
        } else {
          reject(e.error!);
        }
      }
    });
  }

  async init() {
    await this._request({ type: 'init' });
  }

  async start(outputPort: MessagePort, args?: any) {
    await this._request({ type: 'start', outputPort, args }, [outputPort]);
  }

  async status(): Promise<{isRunning: boolean;}> {
    return this._request({ type: 'status' });
  }

  async stop(): Promise<boolean> {
    return this._request({ type: 'stop' });
  }

  terminate() {
    this._worker?.terminate();
    this._worker = null;
  }

}