import { WorkerUrl } from "worker-url";
import { AudioPlayer, AudioRendererType } from "webaudio-stream-player";
import { KSSDecoderDeviceSnapshot } from "./kss-decoder-worker.js";

// The `name` option of WorkerUrl is a marker to determine the webpack's chunkname (i.e. output filename).
// Do not use variable to specify the name - It must be written as an immediate string.
const decoderUrl = new WorkerUrl(new URL("./kss-decoder-worker.ts", import.meta.url), {
  name: "decoder",
});
const workletUrl = new WorkerUrl(new URL("./renderer-worklet.ts", import.meta.url), {
  name: "renderer",
});

export class KSSPlayer extends AudioPlayer {
  constructor(rendererType: AudioRendererType) {
    super({
      rendererType: rendererType,
      decoderWorkerUrl: decoderUrl,
      rendererWorkletUrl: workletUrl,
      rendererWorkletName: "renderer",
      recycleDecoder: true,
      numberOfChannels: 1,
    });
    this.ondecodermessage = (ev: MessageEvent) => {
      if (ev.data.type == "snapshots") {
        const snapshots = ev.data.data as Array<KSSDecoderDeviceSnapshot>;
        this._snapshots.push(...snapshots);
      }
    };
  }

  _snapshots: Array<KSSDecoderDeviceSnapshot> = [];

  findSnapshotAt(frame: number): KSSDecoderDeviceSnapshot | undefined {
    for (let i = 0; i < this._snapshots.length - 1; i++) {
      if (this._snapshots[i].frame <= frame && frame <= this._snapshots[i + 1].frame) {
        return this._snapshots[i];
      }
    }
  }

  override async play(args: any) {
    this._snapshots = [];
    super.play(args);
  }
}

export function createKSSPlayer(rendererType: AudioRendererType): KSSPlayer {
  return new KSSPlayer(rendererType);
}
