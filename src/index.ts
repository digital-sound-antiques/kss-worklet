import { AudioPlayerProgress, AudioPlayerState } from "webaudio-stream-player";
import { type KSSPlayer } from "./kss-player.js";

declare function createKSSPlayer(rendererType: string): KSSPlayer;

let player: KSSPlayer;

export const audioContext = new AudioContext({ sampleRate: 44100 });
export const analyser = audioContext.createAnalyser();
export const gain = audioContext.createGain() as GainNode;

(async () => {
  try {
    player = createKSSPlayer("worklet");
    player.connect(gain);
    gain.connect(analyser);
    gain.gain.value = 3.0;
    analyser.connect(audioContext.destination);
    analyser.fftSize = 256;
    // Note: A secure connection is required to update a global variable from a module.
  } catch (e) {
    console.error(e);
    // Safari does not output an error to the console when it is thrown in a module script.
    throw e;
  }
})();

type WebkitAudioContextState = AudioContextState | "interrupted";

const dataBuf = new Uint8Array(analyser.fftSize / 2);
const waveBuf = new Float32Array(analyser.fftSize);

function renderAnalyzer() {
  requestAnimationFrame(renderAnalyzer);

  if (player.state == "playing") {
    const canvas = document.getElementById("analyser") as HTMLCanvasElement;
    const width = canvas.width;
    const height = canvas.height;
    const ctx = canvas.getContext("2d")!;

    ctx.clearRect(0, 0, width, height);

    analyser.getByteFrequencyData(dataBuf); //Spectrum Data
    ctx.fillStyle = "#c0c0c0";
    for (let i = 0; i < width; i += 4) {
      const h = dataBuf[Math.floor((i * dataBuf.length) / width)];
      ctx.fillRect(i, height - h, 3, h);
    }

    // analyser.getFloatTimeDomainData(waveBuf);
    // ctx.lineWidth = 2;
    // ctx.fillStyle = "none";
    // ctx.strokeStyle = "#00e000";
    // ctx.beginPath();
    // ctx.moveTo(0, height / 2);
    // const sliceWidth = width / waveBuf.length;
    // let x = 0;
    // for (let i = 0; i < waveBuf.length; i++) {
    //   const y = height / 2 + waveBuf[i] * 800;
    //   if (i == 0) {
    //     ctx.moveTo(x, y);
    //   } else {
    //     ctx.lineTo(x, y);
    //   }
    //   x += sliceWidth;
    // }
    // ctx.lineTo(width, height / 2);
    // ctx.stroke();
  }
}

function createListItem({ name, url }: { name: string; url: string }) {
  const node = (document.getElementById(
    "list-item-template"
  ) as HTMLTemplateElement)!.content.cloneNode(true) as DocumentFragment;
  const title = node.querySelector(".title") as HTMLElement;
  title.innerText = name;
  const listItem = node.querySelector(".list-item") as HTMLElement;
  listItem.dataset.url = url;
  listItem.addEventListener("click", () => playItem(listItem));
  return node;
}

function buildMenu() {
  const mmlRoot = "https://raw.githubusercontent.com/mmlbox/";
  const items = [];

  for (let i = 1; i <= 17; i++) {
    const id = i < 10 ? `0${i}` : `${i}`;
    items.push({ name: `HYDLIDE3_${id}`, url: `${mmlRoot}hyd2413/main/fm_psg/mgs/hyd3_${id}.mgs` });
  }
  for (let i = 1; i <= 29; i++) {
    const id = i < 10 ? `0${i}` : `${i}`;
    items.push({ name: `YS1_${id}`, url: `${mmlRoot}ys2413/main/fm_psg/mgs/ys1ex_${id}.mgs` });
  }
  for (let i = 0; i <= 30; i++) {
    const id = i < 10 ? `0${i}` : `${i}`;
    items.push({ name: `YS2_${id}`, url: `${mmlRoot}ys2413/main/fm_psg/mgs/ys2ex_${id}.mgs` });
  }
  for (let i = 0; i <= 59; i++) {
    const id = i < 10 ? `00${i}` : `0${i}`;
    items.push({ name: `SOR_${id}`, url: `${mmlRoot}sor2413/main/fm_psg/mgs/en/soe${id}.mgs` });
  }

  const list = document.getElementById("mgs-list") as HTMLElement;
  for (const item of items) {
    list.appendChild(createListItem(item));
  }
}

export function main() {
  resizeCanvas();

  // renderAnalyzer();
  renderKeyboard();

  document.addEventListener("visibilitychange", () => {
    if ((audioContext.state as WebkitAudioContextState) == "interrupted") {
      /* unawaited */ audioContext.resume();
    }
  });
  document.getElementById("pause")!.classList.add("hidden");

  const typeSelector = document.getElementById("processorType")!;
  typeSelector.onchange = (ev) => {
    player.changeRendererType((ev.target as HTMLSelectElement).value as any);
  };

  const slider = document.getElementById("slider") as HTMLInputElement;
  slider.addEventListener("input", () => {
    console.log("input");
    sliderDragging = true;
  });
  slider.addEventListener("change", () => {
    console.log("change");
    sliderDragging = false;
    player.seekInFrame(parseInt(slider.value));
  });

  buildMenu();

  installDragStage();
}

let selectedUrl: URL | string;
let kss: ArrayBuffer;
let sliderDragging = false;

function playItem(item: Element | null) {
  if (item instanceof HTMLElement && item.classList.contains("list-item")) {
    document.querySelectorAll(".list-item").forEach((el) => el.classList.remove("selected"));
    item.classList.add("selected");
    const url = item.dataset.url!;
    selectedUrl = url;
    play();
  }
}

export async function load(url: URL | string) {
  const res = await fetch(url);
  kss = await res.arrayBuffer();
}

export async function resumeAudioContext() {
  await audioContext.resume();
}

export async function replay() {
  await player.seekInTime(0);
}

function getFrameInfo(currentFrame: number) {
  const snapshot = player.findSnapshotAt(currentFrame);

  if (!snapshot) {
    return { keys: [], vols: [] };
  }

  const psg = snapshot?.psg!;
  const keys: (number | null)[] = [];
  const vols: number[] = [];

  for (let i = 0; i < 3; i++) {
    const fdiv = ((psg[i * 2 + 1] & 0xff) << 8) | psg[i * 2];
    const freq = 3579545 / 2 / 16 / fdiv;
    const vol = psg[8 + i] & 0x0f;
    const C4 = 261.626;
    const kcode = 48 + Math.round(Math.log2(freq / C4) * 12);
    if (vol > 0 && freq != 0) {
      keys.push(kcode);
    } else {
      keys.push(null);
    }
    vols.push(vol);
  }
  const scc = snapshot?.scc!;
  for (let i = 0; i < 5; i++) {
    const fdiv = ((scc[0xc0 + i * 2 + 1] & 0xff) << 8) | scc[0xc0 + i * 2];
    const freq = 3579545 / 2 / 16 / fdiv;
    const vol = scc[0xd0 + i] & 0x0f;
    const C4 = 261.626;
    const kcode = 48 + Math.round(Math.log2(freq / C4) * 12);
    if (vol > 0 && freq != 0) {
      keys.push(kcode);
    } else {
      keys.push(null);
    }
    vols.push(vol);
  }
  const opll = snapshot?.opll!;
  for (let i = 0; i < 9; i++) {
    const fnum = ((opll[0x20 + i] & 0x1) << 8) | opll[0x10 + i];
    const blk = (opll[0x20 + i] & 0xe) >> 1;
    const kon = (opll[0x20 + i] & 0x10) != 0;
    const vol = (0x0f - opll[0x30 + i]) & 0xf;
    const fsam = 3579545 / 72;
    const freq = (fsam * fnum) >> (19 - blk);
    const C4 = 261.626;
    const kcode = 48 + Math.round(Math.log2(freq / C4) * 12);
    if (kon && freq != 0) {
      keys.push(kcode);
    } else {
      keys.push(null);
    }
    vols.push(vol);
  }

  return { keys, vols };
}

const keyWidth = 3;

function drawKeyboardOct(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  h: number,
  highlightKeys: number[]
) {
  const keys = [true, false, true, false, true, true, false, true, false, true, false, true, true];
  let dx = x;

  // White Key
  for (let i = 0; i < keys.length - 1; i++) {
    if (keys[i]) {
      ctx.fillStyle = highlightKeys.indexOf(i) >= 0 ? "#ff8080" : "white";
      ctx.fillRect(dx, y, (keyWidth * 3) / 4, h - 1);
      dx += keys[i + 1] ? keyWidth : keyWidth / 2;
    } else {
      dx += keyWidth / 2;
    }
  }

  dx = x;
  // Black Key
  for (let i = 0; i < keys.length - 1; i++) {
    if (keys[i]) {
      dx += keys[i + 1] ? keyWidth : keyWidth / 2;
    } else {
      ctx.fillStyle = highlightKeys.indexOf(i) >= 0 ? "#ff8080" : "black";
      ctx.fillRect(dx, y, (keyWidth * 3) / 4, (h - 2) / 2 + 1);
      dx += keyWidth / 2;
    }
  }
}

function drawVolume(ctx: CanvasRenderingContext2D, x: number, y: number, vol: number) {
  ctx.fillStyle = "#000000";
  ctx.fillRect(x, y + 1, 15, 3);
  if (vol != 0) {
    ctx.fillStyle = "#008800";
    ctx.fillRect(x, y + 2, vol, 1);
    ctx.fillStyle = "#00e000";
    ctx.fillRect(x + vol, y + 2, 1, 1);
  }
}

const trackNames = [
  "PSG1",
  "PSG2",
  "PSG3",
  "SCC1",
  "SCC2",
  "SCC3",
  "SCC4",
  "SCC5",
  "FM1",
  "FM2",
  "FM3",
  "FM4",
  "FM5",
  "FM6",
  "FM7",
  "FM8",
  "FM9",
];

const tracks = 3 + 5 + 9;
const trackHeight = 8;
const stageWidth = 32 + keyWidth * 7 * 8;

function resizeCanvas() {
  const box = document.getElementById("keyboard-canvas-wrap") as HTMLElement;
  const canvas = document.getElementById("keyboard-canvas") as HTMLCanvasElement;
  const dpr = 2.0; // devicePixelRatio;
  canvas.width = box.offsetWidth * dpr;
  canvas.height = Math.round(canvas.width * trackHeight * tracks) / stageWidth;
  canvas.style.width = `${canvas.width / dpr}px`;
  canvas.style.height = `${canvas.height / dpr}px`;
}

let currentFrame = 0;

function renderKeyboard() {
  requestAnimationFrame(renderKeyboard);

  const canvas = document.getElementById("keyboard-canvas") as HTMLCanvasElement;

  const { keys, vols } = getFrameInfo(currentFrame);

  resizeCanvas();
  const width = canvas.width;
  const height = canvas.height;
  const ctx = canvas.getContext("2d")!;

  ctx.clearRect(0, 0, width, height);
  const scale = width / stageWidth;
  ctx.scale(scale, scale);

  for (let track = 0; track < tracks; track++) {
    const y = track * trackHeight;
    for (let oct = 0; oct < 8; oct++) {
      const kc = keys[track];
      const arr = kc != null ? [kc - 12 * oct] : [];
      ctx.fillStyle = "white";
      ctx.font = "4px sans-serif";
      ctx.fillText(trackNames[track], 0, y + 5);
      drawVolume(ctx, 14, y, vols[track]);
      drawKeyboardOct(ctx, 32 + oct * keyWidth * 7, y, trackHeight, arr);
    }
  }

  ctx.scale(1.0, 1.0);
}

export async function play() {
  await resumeAudioContext();
  await load(selectedUrl);

  if (kss == null) {
    return;
  }

  player.onstatechange = (state: AudioPlayerState) => {
    if (state == "playing") {
      document.getElementById("play")!.classList.add("hidden");
      document.getElementById("pause")!.classList.remove("hidden");
    } else {
      document.getElementById("play")!.classList.remove("hidden");
      document.getElementById("pause")!.classList.add("hidden");
    }

    if (state == "stopped") {
      next();
    }
  };
  player.onprogress = (data: AudioPlayerProgress) => {
    document.getElementById("decoder")!.innerText = `${
      data.decoder?.decodeFrames
    } ${data.decoder?.decodeSpeed?.toFixed(2)}x ${data.decoder?.isDecoding ? "" : "*"}`;
    document.getElementById("renderer")!.innerText = `${data.renderer?.currentTime}/${
      data.renderer?.bufferedTime
    } ${data.renderer?.currentFrame}/${data.renderer?.bufferedFrames}${
      data.renderer?.isFulFilled ? "*" : ""
    }`;
    if (data.renderer != null) {
      const slider = document.getElementById("slider") as HTMLInputElement;
      slider.max = `${data.renderer.bufferedFrames}`;
      if (!sliderDragging) {
        slider.value = `${data.renderer.currentFrame}`;
      }
      currentFrame = data.renderer.currentFrame;
    }
  };
  return player.play({ data: kss });
}

export async function rev() {
  return player.seekInTime(-10000, true);
}

export async function fwd() {
  return player.seekInTime(10000, true);
}

export async function pause() {
  return player.pause();
}

export async function resume() {
  return player.resume();
}

export async function abort() {
  return await player.abort();
}

export async function next() {
  const item = document.querySelector(".list-item.selected");
  if (item instanceof HTMLElement) {
    playItem(item.nextElementSibling);
  }
}

export async function prev() {
  const item = document.querySelector(".list-item.selected");
  if (item instanceof HTMLElement) {
    playItem(item.previousElementSibling);
  }
}

function installDragStage() {
  // const elem = document.body;
  // elem.addEventListener("dragover", onDragOver);
  // elem.addEventListener("dragenter", onDragEnter);
  // elem.addEventListener("dragleave", onDragLeave);
  // elem.addEventListener("drop", onDrop);

  const playerFrame = document.getElementById("player-frame")!;

  playerFrame.addEventListener("dragenter", (e: DragEvent) => {
    e.preventDefault();
  });

  playerFrame.addEventListener("dragover", (e: DragEvent) => {
    const listItem = (e.target as HTMLElement)?.closest(".list-item");
    if (listItem instanceof HTMLElement) {
      listItem.classList.add("drop-focus");
      e.dataTransfer!.dropEffect = "copy";
    } else {
      playerFrame.style.border = "red 2px solid";
      e.dataTransfer!.dropEffect = "move";
    }
    e.preventDefault();
  });

  playerFrame.addEventListener("dragleave", (e) => {
    const listItem = (e.target as HTMLElement)?.closest(".list-item");
    if (listItem instanceof HTMLElement) {
      listItem.classList.remove("drop-focus");
    } else {
      playerFrame.style.border = "none";
    }
  });

  playerFrame.addEventListener("drop", (e) => {
    playerFrame.style.border = "none";
    onDrop(e);
  });
}

async function onDrop(e: DragEvent) {
  console.log(e.target);
  e.preventDefault();
  const insertBefore = (e.target as HTMLElement)?.closest(".list-item") as HTMLElement | null;
  if (insertBefore) {
    insertBefore!.classList.remove("drop-focus");
  }
  return loadFiles(e.dataTransfer!.files, insertBefore);
}

async function loadFiles(files: FileList, insertBefore: HTMLElement | null) {
  const items = [];

  for (const file of files) {
    try {
      const u8 = await loadFromFile(file);
      const base64EncodedData = btoa(String.fromCharCode.apply(null, u8 as any));
      const mimeType = "application/octet-binary";
      const dataURI = `data:${mimeType};base64,${base64EncodedData}`;
      items.push(createListItem({ name: file.name, url: dataURI }));
    } catch (e) {
      console.warn(e);
    }
  }

  if (items.length > 0) {
    const list = document.getElementById("mgs-list") as HTMLElement;
    if (insertBefore != null) {
      for (const item of items) {
        list.insertBefore(item, insertBefore);
      }
    } else {
      list.innerText = "";
      const target = items[0].querySelector(".list-item");
      for (const item of items) {
        list.appendChild(item);
      }
      playItem(target);
    }
  }
}

async function loadFromFile(blob: Blob): Promise<Uint8Array> {
  return new Promise<Uint8Array>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      try {
        const u = new Uint8Array(reader.result as ArrayBuffer);
        let version = 6 < u.length ? String.fromCharCode(u[0], u[1], u[2], u[3], u[4], u[5]) : null;
        if (version && version.indexOf("MGS") === 0) {
          resolve(u);
          return;
        }
        throw new Error("Not a MGS file");
      } catch (e) {
        reject(e);
      }
    };
    reader.readAsArrayBuffer(blob);
  });
}
