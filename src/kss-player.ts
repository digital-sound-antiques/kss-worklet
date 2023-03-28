import { WorkerUrl } from 'worker-url';
import { AudioRendererType } from './audio-renderer';
import { AudioPlayer } from './audio-player';
import { KSSDecoderStartOptions } from './workers/kss-decoder-worker';

// The `name` option of WorkerUrl is a marker to determine the webpack's chunkname (i.e. output filename).
// Do not use variable to specify the name - It must be written as an immediate string.
const decoderUrl = new WorkerUrl(new URL('./workers/kss-decoder-worker.ts', import.meta.url), { name: 'kss-decorder' });
const workletUrl = new WorkerUrl(new URL('./workers/audio-renderer-worklet.ts', import.meta.url), { name: 'renderer' });

export class KSSPlayer extends AudioPlayer {
  constructor(rendererType: AudioRendererType) {
    super({
      rendererType: rendererType,
      decoderWorkerUrl: decoderUrl,
      recycleDecoder: true,
      rendererWorkletUrl: workletUrl,
    });
  }
  async play(args: KSSDecoderStartOptions): Promise<void> {
    super.play(args);
  }
}