export type AudioDecoderRequest = {
  type: AudioDecoderRequestType;
  outputPort?: MessagePort;
  args?: any;
}

export type AudioDecoderRequestWithSeq = { seq: number; } & AudioDecoderRequest;

export type AudioDecoderRequestType = 'init' | 'start' | 'stop' | 'status' | 'dispose' | 'unknown';

export type AudioDecoderResponse = {
  seq: number;
  type: AudioDecoderRequestType;
  error?: any;
  data?: any;
}

class InternalProcessor<T> {
  constructor(id: any, process: (parent: InternalProcessor<T>) => Promise<T>) {
    this.id = id;
    this._process = process;
  }

  id: any;
  aborted = false;

  _completer: Promise<T> | null = null;
  private _process: (parent: InternalProcessor<T>) => Promise<T>;

  abort(): Promise<T> {
    this.aborted = true;
    return this._completer!;
  }

  run(): Promise<T> {
    this._completer = new Promise((resolve) => {
      const res = this._process(this);
      resolve(res);
    });
    return this._completer;
  }
}

export abstract class AudioDecoderWorker {

  _worker: Worker;

  constructor(worker: Worker) {
    this._worker = worker;
    this._worker.onmessage = async (e) => {
      let res: AudioDecoderResponse;
      const req = e.data as AudioDecoderRequestWithSeq;
      try {
        // console.log(`AudioDecoderWorker ${req.type}@${req.seq} latency:${Date.now() - (req as any).ts}ms`);
        const data = await this._onRequest(req);
        res = { seq: req.seq, type: req.type, data: data };
      } catch (e) {
        res = { seq: req.seq, type: req.type, error: e };
      }
      this._worker.postMessage(res);
    }
  }

  private _outputPort: MessagePort | null = null;
  private _totalFrames: number = 0;

  _detachPort() {
    if (this._outputPort != null) {
      this._outputPort!.onmessage = null;
      this._outputPort?.close();
      this._outputPort = null;
    }
  }

  _processorId: number = 0;
  _processor: InternalProcessor<void> | null = null;

  async _onRequest(req: AudioDecoderRequest): Promise<any> {
    switch (req.type) {
      case 'init':
        await this.init();
        break;
      case 'start':
        if (this._processor != null) {
          throw new Error(`Already started.`);
        }
        this._outputPort = req.outputPort!;
        await this.start(req.args);
        this._run();
        return;
      case 'status':
        return {
          isRunning: this._processor != null,
          totalFrames: this._totalFrames,
        };
      case 'stop':
        await this._abort();
        await this.stop();
        this._detachPort();
        return;
      case 'dispose':
        await this._abort();
        await this.dispose();
        this._detachPort();
        return;
      default:
        throw new Error(`Uknown request type: ${(req as any).type}`);
    }
  }

  async _run() {
    this._totalFrames = 0;
    this._processor = new InternalProcessor(this._processorId++, async (parent) => {
      while (!parent.aborted) {
        const array = await this.process();
        if (array != null) {
          this._totalFrames += array?.length;
          this._outputPort?.postMessage(array, [array.buffer]);
        } else {
          this._outputPort?.postMessage(null);
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 1));
      }
      console.log(`processor#${parent.id} is complete.`);
    });
    await this._processor.run();
    this._processor = null;
  }

  async _abort() {
    if (this._processor != null) {
      const id = this._processor.id;
      await this._processor.abort();
      console.log(`processor#${id} is aborted.`);
      this._processor = null;
    }
  }

  abstract init(): Promise<void>;
  abstract start(args: any): Promise<void>;
  abstract process(): Promise<Int16Array | Int32Array | Float32Array | null>;
  abstract stop(): Promise<void>;
  abstract dispose(): Promise<void>;
}
