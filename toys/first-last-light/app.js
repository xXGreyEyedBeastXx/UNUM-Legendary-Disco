const canvas = document.getElementById("light-field");
const context = canvas.getContext("2d", { alpha: false });

const motionToggle = document.getElementById("motion-toggle");
const soundToggle = document.getElementById("sound-toggle");
const pulseButton = document.getElementById("pulse-button");
const returnButton = document.getElementById("return-button");
const tempoInput = document.getElementById("tempo");
const tempoValue = document.getElementById("tempo-value");
const mirrorsInput = document.getElementById("mirrors");
const mirrorsValue = document.getElementById("mirrors-value");
const phaseCopy = document.getElementById("phase-copy");
const status = document.getElementById("status");

const TAU = Math.PI * 2;
const POINT_COUNT = 360;
const CYCLE_BEATS = 16;
const random = mulberry32(8675309);
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const fieldPoints = Array.from({ length: POINT_COUNT }, (_, index) => ({
  angle: random() * TAU,
  radius: Math.sqrt(random()),
  phase: random() * TAU,
  drift: 0.18 + random() * 0.82,
  size: 0.45 + random() * 1.25,
  family: index % 3,
}));

const state = {
  width: 0,
  height: 0,
  dpr: 1,
  elapsed: 0,
  lastFrame: performance.now(),
  playing: !reducedMotion.matches,
  tempo: Number(tempoInput.value),
  mirrors: Number(mirrorsInput.value),
  pointer: { x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5 },
  pulses: [],
  lastPhaseName: "",
  sound: null,
};

function mulberry32(seed) {
  return function next() {
    let value = (seed += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function resizeCanvas() {
  const bounds = canvas.getBoundingClientRect();
  state.dpr = Math.min(window.devicePixelRatio || 1, 2);
  state.width = Math.max(1, bounds.width);
  state.height = Math.max(1, bounds.height);
  canvas.width = Math.round(state.width * state.dpr);
  canvas.height = Math.round(state.height * state.dpr);
  context.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  draw();
}

function cycleState() {
  const secondsPerBeat = 60 / state.tempo;
  const cycleSeconds = secondsPerBeat * CYCLE_BEATS;
  const cycle = (state.elapsed % cycleSeconds) / cycleSeconds;
  const envelope = 0.08 + Math.pow(Math.sin(Math.PI * cycle), 0.72) * 0.92;
  const returnPressure = Math.pow(Math.abs(cycle * 2 - 1), 1.6);
  return { cycle, envelope, returnPressure, cycleSeconds };
}

function phaseFor(cycle) {
  if (cycle < 0.08) return "Before the first beat";
  if (cycle < 0.31) return "First light";
  if (cycle < 0.69) return "The world dances";
  if (cycle < 0.92) return "Last light";
  return "After the last beat";
}

function updatePhase(cycle) {
  const phaseName = phaseFor(cycle);
  if (phaseName !== state.lastPhaseName) {
    state.lastPhaseName = phaseName;
    phaseCopy.textContent = phaseName;
  }
}

function drawBackground(focusX, focusY, envelope, cycle) {
  context.globalCompositeOperation = "source-over";
  context.fillStyle = "#05010b";
  context.fillRect(0, 0, state.width, state.height);

  const radius = Math.max(state.width, state.height) * (0.35 + envelope * 0.24);
  const glow = context.createRadialGradient(focusX, focusY, 0, focusX, focusY, radius);
  glow.addColorStop(0, `hsla(${286 + cycle * 72}, 92%, 46%, ${0.17 + envelope * 0.08})`);
  glow.addColorStop(0.42, `hsla(${197 + cycle * 48}, 88%, 38%, ${0.08 + envelope * 0.05})`);
  glow.addColorStop(1, "rgba(5, 1, 11, 0)");
  context.fillStyle = glow;
  context.fillRect(0, 0, state.width, state.height);
}

function drawBeams(focusX, focusY, envelope, cycle) {
  const diagonal = Math.hypot(state.width, state.height);
  const baseRotation = state.elapsed * 0.12 + Math.sin(cycle * TAU) * 0.19;

  context.save();
  context.globalCompositeOperation = "lighter";

  for (let index = 0; index < state.mirrors; index += 1) {
    const angle = baseRotation + (index / state.mirrors) * TAU;
    const wobble = Math.sin(state.elapsed * 0.7 + index * 1.73) * 0.045 * envelope;
    const x = focusX + Math.cos(angle + wobble) * diagonal * 0.72;
    const y = focusY + Math.sin(angle + wobble) * diagonal * 0.72;
    const hue = (188 + index * (174 / state.mirrors) + cycle * 84) % 360;

    const beam = context.createLinearGradient(focusX, focusY, x, y);
    beam.addColorStop(0, `hsla(${hue}, 100%, 82%, ${0.28 + envelope * 0.2})`);
    beam.addColorStop(0.36, `hsla(${hue + 24}, 100%, 64%, ${0.16 + envelope * 0.18})`);
    beam.addColorStop(1, `hsla(${hue + 48}, 100%, 60%, 0)`);

    context.beginPath();
    context.moveTo(focusX, focusY);
    context.lineTo(x, y);
    context.strokeStyle = beam;
    context.lineWidth = 0.6 + envelope * 1.25;
    context.stroke();
  }

  context.restore();
}

function drawMirrorRing(focusX, focusY, envelope, cycle) {
  const minSide = Math.min(state.width, state.height);
  const radius = minSide * (0.035 + envelope * 0.2);
  const rotation = -state.elapsed * 0.08 + cycle * TAU * 0.18;

  context.save();
  context.globalCompositeOperation = "lighter";
  context.beginPath();

  for (let index = 0; index <= state.mirrors; index += 1) {
    const angle = rotation + (index / state.mirrors) * TAU;
    const x = focusX + Math.cos(angle) * radius;
    const y = focusY + Math.sin(angle) * radius;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }

  context.strokeStyle = `hsla(${318 - cycle * 72}, 100%, 76%, ${0.24 + envelope * 0.35})`;
  context.lineWidth = 1.1;
  context.stroke();
  context.restore();
}

function drawPoints(focusX, focusY, envelope, cycle, returnPressure) {
  const minSide = Math.min(state.width, state.height);

  context.save();
  context.globalCompositeOperation = "lighter";

  for (const point of fieldPoints) {
    const orbit =
      point.angle +
      state.elapsed * (0.035 + point.drift * 0.075) +
      Math.sin(state.elapsed * 0.23 + point.phase) * 0.12 * envelope;
    const breathing = 0.92 + Math.sin(state.elapsed * 0.65 + point.phase) * 0.08;
    const radius = minSide * (0.025 + point.radius * 0.48) * envelope * breathing;
    const flatten = 0.72 + point.family * 0.08;
    const x = focusX + Math.cos(orbit) * radius;
    const y = focusY + Math.sin(orbit) * radius * flatten;
    const hue = (190 + point.family * 62 + cycle * 92 + point.radius * 28) % 360;
    const alpha = 0.18 + envelope * 0.48 + returnPressure * 0.08;

    context.beginPath();
    context.arc(x, y, point.size * (0.75 + envelope * 0.65), 0, TAU);
    context.fillStyle = `hsla(${hue}, 100%, 76%, ${Math.min(alpha, 0.78)})`;
    context.fill();
  }

  context.restore();
}

function drawPulses() {
  context.save();
  context.globalCompositeOperation = "lighter";

  for (const pulse of state.pulses) {
    const age = state.elapsed - pulse.startedAt;
    const progress = age / pulse.duration;
    if (progress < 0 || progress > 1) continue;

    const radius = Math.min(state.width, state.height) * (0.02 + progress * 0.42);
    const alpha = Math.pow(1 - progress, 1.7) * 0.62;
    context.beginPath();
    context.arc(pulse.x * state.width, pulse.y * state.height, radius, 0, TAU);
    context.strokeStyle = `hsla(${pulse.hue}, 100%, 74%, ${alpha})`;
    context.lineWidth = 1 + (1 - progress) * 2;
    context.stroke();
  }

  context.restore();
  state.pulses = state.pulses.filter((pulse) => state.elapsed - pulse.startedAt <= pulse.duration);
}

function drawSeed(focusX, focusY, envelope, cycle) {
  const radius = 2.8 + (1 - envelope) * 7.5;
  const seed = context.createRadialGradient(focusX, focusY, 0, focusX, focusY, radius * 3.4);
  seed.addColorStop(0, "rgba(255, 255, 255, 0.96)");
  seed.addColorStop(0.2, `hsla(${48 + cycle * 46}, 100%, 72%, 0.88)`);
  seed.addColorStop(0.58, `hsla(${315 - cycle * 54}, 100%, 66%, 0.36)`);
  seed.addColorStop(1, "rgba(255, 80, 210, 0)");
  context.fillStyle = seed;
  context.beginPath();
  context.arc(focusX, focusY, radius * 3.4, 0, TAU);
  context.fill();
}

function draw() {
  if (!state.width || !state.height) return;

  const { cycle, envelope, returnPressure } = cycleState();
  state.pointer.x += (state.pointer.targetX - state.pointer.x) * 0.045;
  state.pointer.y += (state.pointer.targetY - state.pointer.y) * 0.045;

  const travel = envelope * 0.18;
  const focusX = state.width * (0.5 + (state.pointer.x - 0.5) * travel);
  const focusY = state.height * (0.48 + (state.pointer.y - 0.5) * travel);

  updatePhase(cycle);
  drawBackground(focusX, focusY, envelope, cycle);
  drawBeams(focusX, focusY, envelope, cycle);
  drawMirrorRing(focusX, focusY, envelope, cycle);
  drawPoints(focusX, focusY, envelope, cycle, returnPressure);
  drawPulses();
  drawSeed(focusX, focusY, envelope, cycle);
  updateSound(cycle, envelope);
}

function frame(now) {
  const delta = Math.min((now - state.lastFrame) / 1000, 0.05);
  state.lastFrame = now;
  if (state.playing) state.elapsed += delta;
  draw();
  requestAnimationFrame(frame);
}

function setMotion(nextPlaying, message) {
  state.playing = nextPlaying;
  motionToggle.setAttribute("aria-pressed", String(nextPlaying));
  motionToggle.textContent = nextPlaying ? "Pause motion" : "Resume motion";
  status.textContent = message ?? (nextPlaying ? "The field is moving." : "Motion paused. The field remains available.");
}

function addPulse(x = state.pointer.targetX, y = state.pointer.targetY) {
  const { cycle } = cycleState();
  state.pulses.push({
    x,
    y,
    startedAt: state.elapsed,
    duration: 1.65,
    hue: (184 + cycle * 164) % 360,
  });
  playPulseTone(cycle);
  status.textContent = "Pulse received. The current field will carry it outward.";
}

function returnToBeginning() {
  state.elapsed = 0;
  state.pulses = [];
  state.pointer.targetX = 0.5;
  state.pointer.targetY = 0.5;
  state.pointer.x = 0.5;
  state.pointer.y = 0.5;
  state.lastPhaseName = "";
  draw();
  status.textContent = "Returned to the first seed.";
}

async function enableSound() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) {
    status.textContent = "This browser does not provide Web Audio. The light can keep dancing silently.";
    return;
  }

  const audioContext = new AudioContext();
  const master = audioContext.createGain();
  master.gain.setValueAtTime(0.0001, audioContext.currentTime);
  master.gain.exponentialRampToValueAtTime(0.032, audioContext.currentTime + 0.35);
  master.connect(audioContext.destination);

  const frequencies = [55, 82.5, 110];
  const oscillators = frequencies.map((frequency, index) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = index === 1 ? "triangle" : "sine";
    oscillator.frequency.value = frequency;
    gain.gain.value = index === 0 ? 0.24 : 0.12;
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start();
    return { oscillator, gain, base: frequency };
  });

  state.sound = { context: audioContext, master, oscillators };
  soundToggle.setAttribute("aria-pressed", "true");
  soundToggle.textContent = "Sound: on";
  status.textContent = "Sound enabled quietly. Disable it at any time.";
}

function disableSound() {
  if (!state.sound) return;
  const sound = state.sound;
  state.sound = null;
  const now = sound.context.currentTime;
  sound.master.gain.cancelScheduledValues(now);
  sound.master.gain.setTargetAtTime(0.0001, now, 0.035);
  window.setTimeout(() => {
    for (const voice of sound.oscillators) voice.oscillator.stop();
    sound.context.close();
  }, 180);
  soundToggle.setAttribute("aria-pressed", "false");
  soundToggle.textContent = "Sound: off";
  status.textContent = "Sound disabled.";
}

function updateSound(cycle, envelope) {
  if (!state.sound) return;
  const now = state.sound.context.currentTime;
  for (let index = 0; index < state.sound.oscillators.length; index += 1) {
    const voice = state.sound.oscillators[index];
    const breathing = 1 + Math.sin(cycle * TAU + index * 1.9) * 0.018 * envelope;
    voice.oscillator.frequency.setTargetAtTime(voice.base * breathing, now, 0.08);
  }
}

function playPulseTone(cycle) {
  if (!state.sound) return;
  const audioContext = state.sound.context;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const now = audioContext.currentTime;
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(176 + cycle * 132, now);
  oscillator.frequency.exponentialRampToValueAtTime(88 + cycle * 66, now + 0.42);
  gain.gain.setValueAtTime(0.028, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.44);
  oscillator.connect(gain);
  gain.connect(state.sound.master);
  oscillator.start(now);
  oscillator.stop(now + 0.46);
}

function setPointer(event) {
  const bounds = canvas.getBoundingClientRect();
  state.pointer.targetX = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
  state.pointer.targetY = Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height));
}

motionToggle.addEventListener("click", () => {
  setMotion(!state.playing);
});

soundToggle.addEventListener("click", async () => {
  if (state.sound) disableSound();
  else await enableSound();
});

pulseButton.addEventListener("click", () => addPulse());
returnButton.addEventListener("click", returnToBeginning);

tempoInput.addEventListener("input", () => {
  state.tempo = Number(tempoInput.value);
  tempoValue.textContent = `${state.tempo} BPM`;
});

mirrorsInput.addEventListener("input", () => {
  state.mirrors = Number(mirrorsInput.value);
  mirrorsValue.textContent = String(state.mirrors);
});

canvas.addEventListener("pointermove", setPointer, { passive: true });
canvas.addEventListener("pointerdown", (event) => {
  setPointer(event);
  addPulse(state.pointer.targetX, state.pointer.targetY);
});

document.addEventListener("keydown", (event) => {
  const target = event.target;
  if (target instanceof HTMLInputElement || target instanceof HTMLButtonElement) return;

  if (event.code === "Space") {
    event.preventDefault();
    setMotion(!state.playing);
  } else if (event.key.toLowerCase() === "r") {
    returnToBeginning();
  }
});

reducedMotion.addEventListener("change", (event) => {
  if (event.matches) setMotion(false, "Reduced-motion preference detected. Motion paused.");
});

document.addEventListener("visibilitychange", () => {
  if (!state.sound) return;
  if (document.hidden) state.sound.context.suspend();
  else state.sound.context.resume();
});

window.addEventListener("resize", resizeCanvas);

if (reducedMotion.matches) {
  setMotion(false, "Reduced-motion preference detected. Start motion only if you want it.");
} else {
  setMotion(true, "Move through the field to bend the light. Space pauses. R returns.");
}

resizeCanvas();
requestAnimationFrame(frame);
