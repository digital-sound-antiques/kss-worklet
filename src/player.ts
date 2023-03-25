import { isSafari } from './utils';
import { AudioDecoderController } from './workers/decoder-controller';
import { StreamerController, StreamerWorkletController, StreamerScriptController } from './workers/streamer-controller';

export type AudioStreamerType = 'script' | 'worklet';

export type AudioPlayerOptions = {
  sampleRate?: number | null;
  recycle?: {
    decoder?: boolean | null;
    streamer?: boolean | null;
  };
};

export type AudioPlayerState = 'initial' | 'playing' | 'paused' | 'stopped' | 'disposed';

export type AudioPlayerProgress = {
  currentFrame: number;
  bufferedFrames: number;
  isClosed: boolean;
};

export class AudioPlayer {

  constructor(args: {
    streamerType?: AudioStreamerType | null;
    decoderWorkerUrl: URL;
    recycleDecoder?: boolean | null;
    streamerWorkletUrl?: URL | null;
    streamerWorkletName?: string | null;
    sampleRate?: number | null;
  }) {
    this.streamerType = args.streamerType == null ? (isSafari ? 'script' : 'worklet') : args.streamerType;
    this.decoderUrl = args.decoderWorkerUrl;
    this.streamerUrl = args.streamerWorkletUrl;
    this.streamerName = args.streamerWorkletName;
    this.recycleDecoder = args.recycleDecoder ?? false;
    this.sampleRate = args.sampleRate ?? 44100;
  }

  sampleRate: number;

  decoderUrl: URL;
  decoder: AudioDecoderController | null = null;
  recycleDecoder: boolean;

  streamerType: AudioStreamerType | null = null;
  streamerUrl?: URL | null;
  streamerName?: string | null;
  streamer: StreamerController | null = null;

  audioContext: AudioContext | null = null;


  state: AudioPlayerState = 'initial';
  progress: AudioPlayerProgress | null = null;

  onstatechange: ((state: AudioPlayerState) => void) | null = null;
  onprogress: ((ev: AudioPlayerProgress) => void) | null = null;

  async createAudioContextAndRegisterWorklet(): Promise<void> {
    try {
      this.audioContext = new AudioContext({ sampleRate: this.sampleRate });
      if (this.streamerType == 'worklet') {
        await this.audioContext.audioWorklet.addModule(this.streamerUrl!);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async init(): Promise<void> {
    if (this.audioContext != null) {
      throw new Error('This object has already beend initialized.');
    }
    if (isSafari && this.streamerType == 'worklet') {
      // If Safari, AudioWorklet must be registered before the first user interaction.
      await this.createAudioContextAndRegisterWorklet();
    }
  }

  async _prepareStreamer(): Promise<void> {
    if (this.streamer == null) {
      console.log(`prepareStreamer: ${this.streamerType}`);
      try {
        if (this.streamerType == 'worklet') {
          this.streamer = new StreamerWorkletController(this.audioContext!, this.streamerName!);
        } else if (this.streamerType == 'script') {
          this.streamer = new StreamerScriptController(this.audioContext!);
        } else {
          throw Error(`Unsupported streamer type: ${this.streamerType}`);
        }
      } catch (e) {
        console.error(e);
        throw e;
      }
    }
  }

  // This method must be called before play() synchonized with user interaction.
  async unlockAudio(): Promise<void> {
    if (this.audioContext == null) {
      // AudioContext must be created synchronize with the user interaction, except Safari.
      await this.createAudioContextAndRegisterWorklet();
    }
    // AudioWorkletNode and ScriptProcessorNode must be created synchronize with the user interaction.
    await this._prepareStreamer();
  }

  async play(args: any): Promise<void> {
    const mch = new MessageChannel();

    if (this.streamer == null) {
      throw new Error('Streamer is not initialized. Please call unlockAudio() in advance.');
    }

    if (this.decoder == null) {
      this.decoder = new AudioDecoderController(new Worker(this.decoderUrl));
      await this.decoder.init();
    } else {
      await this.decoder.stop();
    }
    await this.decoder.start(mch.port2, args);

    this.streamer.connect(this.audioContext!.destination);
    this.streamer.onstatechange = (ev) => {
      this.state = ev;
      if (this.onstatechange != null) {
        this.onstatechange(ev);
      }
    }
    this.streamer.onprogress = (ev) => {
      this.progress = ev;
      if (this.onprogress != null) {
        this.onprogress(ev);
      }
    }
    await this.streamer.play(mch.port1);
  }

  async pause(): Promise<void> {
    await this.streamer?.pause();
  }

  async resume(): Promise<void> {
    await this.streamer?.resume();
  }

  async stop(): Promise<void> {
    if (this.streamer != null) {
      this.streamer.disconnect();
      this.streamer.onprogress = null;
      await this.streamer.stop();
    }
    await this.decoder?.stop();

    if (!this.recycleDecoder) {
      this.decoder?.terminate();
      this.decoder = null;
    }
  }

  async dispose(): Promise<void> {
    if (this.streamer != null) {
      this.streamer.disconnect();
      this.streamer.onprogress = null;
      this.streamer.onstatechange = null;
      await this.streamer.dispose();
      this.streamer = null;
    }
    this.audioContext?.close();
    this.audioContext = null;
    await this.decoder?.stop();
    this.decoder?.terminate();
    this.decoder = null;
  }

}
