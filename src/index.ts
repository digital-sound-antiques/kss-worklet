import { WorkerUrl } from 'worker-url';
import { AudioPlayer, AudioStreamerType } from './player';
import { KSSDecoderStartOptions } from './workers/kss-decoder-worker';

// The `name` option of WorkerUrl is a marker to determine the webpack's chunkname (i.e. output filename).
// Do not use variable to specify the name - It must be written as an immediate string.
const decoderUrl = new WorkerUrl(new URL('./workers/kss-decoder-worker.ts', import.meta.url), { name: 'kss-decorder' });
const workletUrl = new WorkerUrl(new URL('./workers/streamer-worklet.ts', import.meta.url), { name: 'streamer' });

export class KSSPlayer extends AudioPlayer {
  constructor(args: { streamerType?: 'script' | 'worklet' | null, sampleRate?: number }) {
    super({
      sampleRate: args.sampleRate,
      streamerType: args.streamerType,
      decoderWorkerUrl: decoderUrl,
      recycleDecoder: true,
      streamerWorkletUrl: workletUrl,
      streamerWorkletName: 'streamer',
    });
  }
  async play(args: KSSDecoderStartOptions): Promise<void> {
    super.play(args);
  }
}

const sampleRate = 44100;

let player: KSSPlayer | null;
let playerMap: { [key: string]: KSSPlayer } = {};

(async () => {
  try {
    const autoPlayer = playerMap['auto'] = new KSSPlayer({ sampleRate });
    const scriptPlayer = playerMap['script'] = new KSSPlayer({ streamerType: 'script', sampleRate });
    const workletPlayer = playerMap['worklet'] = new KSSPlayer({ streamerType: 'worklet', sampleRate });

    await autoPlayer.init();
    await scriptPlayer.init();
    await workletPlayer.init();
    player = autoPlayer;
    // Note: A secure connection is required to update a global variable from a module.
  } catch (e) {
    console.error(e);
    // Safari does not output an error to the console when it is thrown in a module script.
    throw e;
  }
})();

export function getCurrentPlayer(): KSSPlayer {
  return player!;
}

export async function onChangeType(type: AudioStreamerType): Promise<void> {
  player = playerMap[type] || playerMap['auto'];
}

export async function onPlay(url: URL | string): Promise<void> {
  for(const key in playerMap) {
    const p = await playerMap[key];
    if (p != player) { p.stop() };
  }

  await player?.unlockAudio();
  console.log(`fetch start: ${url}`);
  const res = await fetch(url);
  const data = await res.arrayBuffer();
  console.log(`fetch complete`);
  await player?.play({ data, sampleRate });
}

export async function onTogglePause(): Promise<void> {
  if (player?.state == 'playing') {
    await player?.pause();
  } else if (player?.state == 'paused') {
    await player?.resume();
  }
}

export async function onStop(): Promise<void> {
  for(const key in playerMap) {
    await playerMap[key].stop();
  }
}
