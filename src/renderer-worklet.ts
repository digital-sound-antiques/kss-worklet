import { runAudioWorklet, AudioRendererWorkletProcessor } from "webaudio-stream-player/dist/workers/audio-renderer-worklet-processor.js";

runAudioWorklet('renderer', AudioRendererWorkletProcessor);