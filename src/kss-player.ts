import { WorkerUrl } from 'worker-url';
import { AudioPlayer, AudioRendererType } from 'webaudio-stream-player';
import { KSSDecoderStartOptions } from './kss-decoder-worker';

// The `name` option of WorkerUrl is a marker to determine the webpack's chunkname (i.e. output filename).
// Do not use variable to specify the name - It must be written as an immediate string.
const decoderUrl = new WorkerUrl(new URL('./kss-decoder-worker.ts', import.meta.url), { name: 'kss-decorder' });
const workletUrl = new WorkerUrl(new URL('./renderer-worklet.ts', import.meta.url), { name: 'renderer' });

export class KSSPlayer extends AudioPlayer {
  constructor(rendererType: AudioRendererType) {
    super({
      rendererType: rendererType,
      decoderWorkerUrl: decoderUrl,
      rendererWorkletUrl: workletUrl,
      rendererWorkletName: 'renderer',
      recycleDecoder: true,
      numberOfChannels: 1,
    });
  }
  async play(args: KSSDecoderStartOptions): Promise<void> {
    super.play(args);
  }
}