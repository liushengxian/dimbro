/**
 * 程序化音频：WebAudio 合成背景音乐与音效，不依赖外部音频素材。
 *
 * 浏览器要求音频上下文由用户手势启动，因此设置默认关闭；只有玩家主动
 * 打开音乐 / 音效后才会创建 AudioContext。若设置已开启但页面刚加载，
 * 会等待第一次点击或按键再恢复上下文。
 */

export type AudioCue =
  | 'pause'
  | 'resume'
  | 'weaponPulse'
  | 'weaponScatter'
  | 'weaponMelee'
  | 'weaponGear'
  | 'weaponRail'
  | 'enemyShot'
  | 'enemyBurst'
  | 'hit'
  | 'crit'
  | 'kill'
  | 'eliteKill'
  | 'coin'
  | 'playerHit'
  | 'shieldBreak'
  | 'reset'
  | 'focusOn'
  | 'focusOff'
  | 'bossIntro'
  | 'bossPhase'
  | 'bossCast'
  | 'bossEnrage'
  | 'bossKill'
  | 'waveStart'
  | 'waveClear'
  | 'victory'
  | 'defeat'
  | 'upgrade'
  | 'purchase'
  | 'deny';

export type AudioScene = 'menu' | 'battle';

export interface AudioSettings {
  music: boolean;
  sound: boolean;
}

const LOOKAHEAD_SECONDS = 0.18;
const SCHEDULER_INTERVAL_MS = 24;

/** 同类音效的最短间隔，避免高射速武器或成群敌人把音频压爆。 */
const CUE_GAP: Partial<Record<AudioCue, number>> = {
  weaponPulse: 0.055,
  weaponScatter: 0.075,
  weaponMelee: 0.09,
  weaponGear: 0.09,
  weaponRail: 0.12,
  enemyShot: 0.09,
  enemyBurst: 0.14,
  hit: 0.045,
  crit: 0.06,
  kill: 0.05,
  eliteKill: 0.1,
  coin: 0.045,
  playerHit: 0.12,
  shieldBreak: 0.12,
  bossCast: 0.2,
};

const MENU_CHORDS: readonly (readonly number[])[] = [
  [50, 53, 57], // Dm
  [46, 50, 53], // Bb
  [41, 45, 48], // F
  [43, 47, 50], // G
];
const MENU_ROOTS = [38, 34, 29, 31];
const MENU_ARP = [0, 1, 2, 1, 0, 2, 1, 2];

const BATTLE_CHORDS: readonly (readonly number[])[] = [
  [50, 53, 57], // Dm
  [46, 50, 53], // Bb
  [43, 46, 50], // Gm
  [45, 49, 52], // A
];
const BATTLE_ROOTS = [38, 34, 31, 33];
const BATTLE_ARP = [0, 2, 1, 2, 0, 3, 2, 1];
const BATTLE_BASS = [0, 0, 7, 0, 10, 0, 7, 5];

function midiToFrequency(note: number): number {
  return 440 * 2 ** ((note - 69) / 12);
}

function randomIdle(): number {
  return 0.5 + Math.random() * 0.5;
}

export class GameAudio {
  private context: AudioContext | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private musicEnabled = false;
  private soundEnabled = false;
  private scene: AudioScene = 'menu';
  private paused = false;
  private schedulerId: number | null = null;
  private step = 0;
  private nextNoteTime = 0;
  private lastCueAt = new Map<AudioCue, number>();
  private unlockInstalled = false;
  private disposed = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.installUnlockListeners();
      document.addEventListener('visibilitychange', this.handleVisibility);
    }
  }

  configure(settings: AudioSettings): void {
    const wasEnabled = this.musicEnabled || this.soundEnabled;
    this.musicEnabled = settings.music;
    this.soundEnabled = settings.sound;
    const enabled = this.musicEnabled || this.soundEnabled;

    if (enabled) {
      this.ensureContext();
      this.resumeContext();
      if (this.musicEnabled) this.ensureScheduler();
    } else if (wasEnabled) {
      this.stopScheduler();
    }

    this.applyMix();
  }

  setScene(scene: AudioScene): void {
    if (this.scene === scene) return;
    this.scene = scene;
    this.step = 0;
    if (this.context !== null) {
      this.nextNoteTime = this.context.currentTime + 0.06;
    }
  }

  setPaused(paused: boolean): void {
    if (this.paused === paused) return;
    this.paused = paused;
    this.applyMix();
  }

  play(cue: AudioCue): void {
    if (!this.soundEnabled || this.disposed) return;
    const context = this.context;
    if (context === null || context.state !== 'running') return;

    const now = context.currentTime;
    const gap = CUE_GAP[cue] ?? 0.03;
    const last = this.lastCueAt.get(cue) ?? -Infinity;
    if (now - last < gap) return;
    this.lastCueAt.set(cue, now);

    const bus = this.sfxBus;
    if (bus === null) return;

    switch (cue) {
      case 'pause':
        this.tone(bus, { freq: 520, to: 360, duration: 0.09, type: 'sine', gain: 0.08 });
        break;
      case 'resume':
        this.tone(bus, { freq: 360, to: 560, duration: 0.1, type: 'sine', gain: 0.08 });
        break;
      case 'weaponPulse':
        this.tone(bus, {
          freq: 920,
          to: 240,
          duration: 0.06,
          type: 'square',
          gain: 0.055,
          filter: 2600,
        });
        break;
      case 'weaponScatter':
        this.noise(bus, { duration: 0.09, gain: 0.16, filter: 720, q: 0.9 });
        this.tone(bus, { freq: 180, to: 70, duration: 0.08, type: 'square', gain: 0.05 });
        break;
      case 'weaponMelee':
        this.tone(bus, {
          freq: 160,
          to: 54,
          duration: 0.15,
          type: 'sawtooth',
          gain: 0.1,
          filter: 900,
        });
        this.noise(bus, { duration: 0.1, gain: 0.1, filter: 1400, q: 0.7 });
        break;
      case 'weaponGear':
        this.tone(bus, {
          freq: 540,
          to: 300,
          duration: 0.11,
          type: 'triangle',
          gain: 0.07,
        });
        break;
      case 'weaponRail':
        this.tone(bus, {
          freq: 1500,
          to: 210,
          duration: 0.18,
          type: 'sawtooth',
          gain: 0.075,
          filter: 3400,
        });
        this.noise(bus, { duration: 0.08, gain: 0.07, filter: 2600, q: 1.6 });
        break;
      case 'enemyShot':
        this.tone(bus, {
          freq: 280,
          to: 140,
          duration: 0.08,
          type: 'triangle',
          gain: 0.035,
          filter: 1200,
        });
        break;
      case 'enemyBurst':
        this.tone(bus, {
          freq: 180,
          to: 90,
          duration: 0.16,
          type: 'sawtooth',
          gain: 0.045,
          filter: 800,
        });
        break;
      case 'hit':
        this.noise(bus, { duration: 0.035, gain: 0.08, filter: 2600, q: 1.2 });
        break;
      case 'crit':
        this.tone(bus, {
          freq: 1320,
          to: 900,
          duration: 0.06,
          type: 'square',
          gain: 0.05,
          filter: 4000,
        });
        break;
      case 'kill':
        this.noise(bus, { duration: 0.11, gain: 0.09, filter: 900, q: 0.8 });
        this.tone(bus, { freq: 150, to: 60, duration: 0.1, type: 'square', gain: 0.04 });
        break;
      case 'eliteKill':
        this.noise(bus, { duration: 0.24, gain: 0.17, filter: 600, q: 0.7 });
        this.tone(bus, { freq: 120, to: 42, duration: 0.24, type: 'sawtooth', gain: 0.08 });
        break;
      case 'coin':
        this.tone(bus, { freq: 1480, duration: 0.045, type: 'sine', gain: 0.045 });
        this.tone(bus, {
          freq: 1980,
          duration: 0.06,
          type: 'sine',
          gain: 0.04,
          when: 0.045,
        });
        break;
      case 'playerHit':
        this.tone(bus, { freq: 110, to: 48, duration: 0.22, type: 'sine', gain: 0.15 });
        this.noise(bus, { duration: 0.12, gain: 0.1, filter: 380, q: 0.8 });
        break;
      case 'shieldBreak':
        this.noise(bus, { duration: 0.18, gain: 0.12, filter: 3200, q: 1.4 });
        this.tone(bus, { freq: 760, to: 210, duration: 0.16, type: 'triangle', gain: 0.07 });
        break;
      case 'reset':
        this.resetSweep(bus);
        break;
      case 'focusOn':
        this.tone(bus, { freq: 420, to: 700, duration: 0.09, type: 'sine', gain: 0.045 });
        break;
      case 'focusOff':
        this.tone(bus, { freq: 520, to: 330, duration: 0.1, type: 'sine', gain: 0.035 });
        break;
      case 'bossIntro':
        this.tone(bus, { freq: 52, to: 68, duration: 1.25, type: 'sawtooth', gain: 0.16, filter: 320 });
        this.noise(bus, { duration: 0.9, gain: 0.1, filter: 260, q: 0.6, when: 0.18 });
        break;
      case 'bossPhase':
        this.tone(bus, { freq: 78, to: 44, duration: 0.7, type: 'sawtooth', gain: 0.14, filter: 480 });
        this.noise(bus, { duration: 0.36, gain: 0.11, filter: 900, q: 0.7 });
        break;
      case 'bossCast':
        this.tone(bus, {
          freq: 210,
          to: 520,
          duration: 0.28,
          type: 'triangle',
          gain: 0.06,
          filter: 1600,
        });
        break;
      case 'bossEnrage':
        this.tone(bus, { freq: 96, to: 60, duration: 0.5, type: 'sawtooth', gain: 0.12, filter: 700 });
        break;
      case 'bossKill':
        this.noise(bus, { duration: 0.8, gain: 0.2, filter: 500, q: 0.5 });
        this.tone(bus, { freq: 90, to: 34, duration: 0.9, type: 'sawtooth', gain: 0.14 });
        break;
      case 'waveStart':
        this.tone(bus, { freq: 220, to: 330, duration: 0.18, type: 'triangle', gain: 0.055 });
        this.tone(bus, {
          freq: 330,
          to: 440,
          duration: 0.2,
          type: 'triangle',
          gain: 0.045,
          when: 0.12,
        });
        break;
      case 'waveClear':
        this.arp(bus, [62, 65, 69, 74], 0.07, 0.06, 'triangle');
        break;
      case 'victory':
        this.arp(bus, [62, 66, 69, 74, 78, 81], 0.09, 0.075, 'triangle');
        this.tone(bus, { freq: 82, to: 62, duration: 1.4, type: 'sine', gain: 0.09 });
        break;
      case 'defeat':
        this.arp(bus, [57, 53, 50, 45], 0.16, 0.075, 'sawtooth', 900);
        this.tone(bus, { freq: 80, to: 38, duration: 1.1, type: 'sine', gain: 0.1 });
        break;
      case 'upgrade':
        this.arp(bus, [69, 73, 76, 81], 0.065, 0.06, 'triangle');
        break;
      case 'purchase':
        this.noise(bus, { duration: 0.03, gain: 0.07, filter: 3200, q: 2 });
        this.tone(bus, { freq: 740, to: 980, duration: 0.05, type: 'square', gain: 0.04, when: 0.04 });
        break;
      case 'deny':
        this.tone(bus, { freq: 150, to: 120, duration: 0.12, type: 'square', gain: 0.05, filter: 600 });
        break;
      default:
        break;
    }
  }

  dispose(): void {
    this.disposed = true;
    this.stopScheduler();
    this.removeUnlockListeners();
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibility);
    }
    const context = this.context;
    this.context = null;
    this.musicBus = null;
    this.sfxBus = null;
    this.noiseBuffer = null;
    if (context !== null) {
      void context.close().catch(() => undefined);
    }
  }

  private installUnlockListeners(): void {
    if (this.unlockInstalled) return;
    this.unlockInstalled = true;
    window.addEventListener('pointerdown', this.handleUnlock, { capture: true, passive: true });
    window.addEventListener('keydown', this.handleUnlock, { capture: true });
  }

  private removeUnlockListeners(): void {
    if (!this.unlockInstalled || typeof window === 'undefined') return;
    this.unlockInstalled = false;
    window.removeEventListener('pointerdown', this.handleUnlock, { capture: true });
    window.removeEventListener('keydown', this.handleUnlock, { capture: true });
  }

  private handleUnlock = (): void => {
    if (!this.musicEnabled && !this.soundEnabled) return;
    this.ensureContext();
    this.resumeContext();
    if (this.musicEnabled) this.ensureScheduler();
  };

  private handleVisibility = (): void => {
    if (typeof document === 'undefined') return;
    if (document.visibilityState === 'hidden') {
      if (this.context?.state === 'running') {
        void this.context.suspend().catch(() => undefined);
      }
      return;
    }
    if (!this.musicEnabled && !this.soundEnabled) return;
    this.ensureContext();
    this.resumeContext();
    if (this.musicEnabled) this.ensureScheduler();
  };

  private ensureContext(): void {
    if (this.context !== null || this.disposed || typeof window === 'undefined') return;

    const AudioContextCtor =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AudioContextCtor === undefined) return;

    try {
      const context = new AudioContextCtor();
      const master = context.createGain();
      const musicBus = context.createGain();
      const sfxBus = context.createGain();
      const compressor = context.createDynamicsCompressor();
      master.gain.value = 0.9;
      musicBus.gain.value = 0;
      sfxBus.gain.value = 0;
      compressor.threshold.value = -16;
      compressor.knee.value = 12;
      compressor.ratio.value = 6;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.25;
      musicBus.connect(master);
      sfxBus.connect(master);
      master.connect(compressor);
      compressor.connect(context.destination);

      const noiseBuffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
      const samples = noiseBuffer.getChannelData(0);
      for (let index = 0; index < samples.length; index += 1) {
        samples[index] = Math.random() * 2 - 1;
      }

      this.context = context;
      this.musicBus = musicBus;
      this.sfxBus = sfxBus;
      this.noiseBuffer = noiseBuffer;
      this.nextNoteTime = context.currentTime + 0.08;
    } catch {
      // 浏览器禁用音频或资源不足时安全降级为静音。
    }
  }

  private resumeContext(): void {
    const context = this.context;
    if (context === null) return;
    if (context.state === 'suspended') {
      void context.resume().catch(() => undefined);
    }
  }

  private applyMix(): void {
    const context = this.context;
    if (context === null) return;
    const now = context.currentTime;
    const musicTarget = this.musicEnabled ? (this.paused ? 0.07 : 0.26) : 0;
    const soundTarget = this.soundEnabled ? 0.5 : 0;
    this.musicBus?.gain.setTargetAtTime(musicTarget, now, 0.08);
    this.sfxBus?.gain.setTargetAtTime(soundTarget, now, 0.05);
  }

  private ensureScheduler(): void {
    if (this.schedulerId !== null || !this.musicEnabled) return;
    if (typeof window === 'undefined' || this.context === null) return;
    this.resumeContext();
    this.schedulerId = window.setInterval(this.schedule, SCHEDULER_INTERVAL_MS);
  }

  private stopScheduler(): void {
    if (this.schedulerId === null) return;
    if (typeof window !== 'undefined') {
      window.clearInterval(this.schedulerId);
    }
    this.schedulerId = null;
  }

  private schedule = (): void => {
    const context = this.context;
    if (context === null || !this.musicEnabled || this.disposed) return;
    if (context.state !== 'running') return;

    if (this.nextNoteTime < context.currentTime - 0.5) {
      this.nextNoteTime = context.currentTime + 0.03;
    }

    const sixteenth = 60 / (this.scene === 'battle' ? 132 : 76) / 4;
    let guard = 0;
    while (this.nextNoteTime < context.currentTime + LOOKAHEAD_SECONDS && guard < 32) {
      const offset = Math.max(0, this.nextNoteTime - context.currentTime);
      this.scheduleStep(this.step, offset, sixteenth);
      this.step = (this.step + 1) % 64;
      this.nextNoteTime += sixteenth;
      guard += 1;
    }
  };

  private scheduleStep(step: number, when: number, sixteenth: number): void {
    const bus = this.musicBus;
    if (bus === null) return;

    if (this.scene === 'menu') {
      this.scheduleMenuStep(bus, step, when, sixteenth);
    } else {
      this.scheduleBattleStep(bus, step, when, sixteenth);
    }
  }

  private scheduleMenuStep(
    bus: GainNode,
    step: number,
    when: number,
    sixteenth: number,
  ): void {
    const bar = Math.floor(step / 16) % MENU_CHORDS.length;
    const chord = MENU_CHORDS[bar] ?? MENU_CHORDS[0]!;
    const root = MENU_ROOTS[bar] ?? MENU_ROOTS[0]!;

    if (step % 16 === 0) {
      for (const note of chord) {
        this.pad(bus, midiToFrequency(note), when, sixteenth * 15, 0.032);
      }
      this.bass(bus, midiToFrequency(root), when, sixteenth * 6, 0.06);
    }

    if (step % 16 === 8) {
      this.bass(bus, midiToFrequency(root + 7), when, sixteenth * 4, 0.045);
    }

    if (step % 2 === 0) {
      const arpIndex = Math.floor(step / 2) % MENU_ARP.length;
      const degree = MENU_ARP[arpIndex] ?? 0;
      const note = (chord[degree % chord.length] ?? chord[0]!) + 12;
      this.pluck(bus, midiToFrequency(note), when, sixteenth * 1.7, 0.026 * randomIdle());
    }

    if (step % 32 === 16) {
      this.noise(bus, {
        duration: sixteenth * 12,
        gain: 0.02,
        filter: 1500,
        q: 0.4,
        type: 'bandpass',
        when,
        attack: sixteenth * 4,
      });
    }
  }

  private scheduleBattleStep(
    bus: GainNode,
    step: number,
    when: number,
    sixteenth: number,
  ): void {
    const bar = Math.floor(step / 16) % BATTLE_CHORDS.length;
    const chord = BATTLE_CHORDS[bar] ?? BATTLE_CHORDS[0]!;
    const root = BATTLE_ROOTS[bar] ?? BATTLE_ROOTS[0]!;

    if (step % 4 === 0) {
      this.kick(bus, when, 0.16);
    }
    if (step % 8 === 4) {
      this.noise(bus, { duration: 0.09, gain: 0.05, filter: 1900, q: 0.8, when });
    }
    if (step % 2 === 1) {
      this.noise(bus, {
        duration: 0.03,
        gain: 0.018,
        filter: 6500,
        q: 1.1,
        type: 'highpass',
        when,
      });
    }

    if (step % 16 === 0) {
      for (const note of chord) {
        this.pad(bus, midiToFrequency(note), when, sixteenth * 14, 0.018);
      }
    }

    if (step % 2 === 0) {
      const bassIndex = (step / 2) % BATTLE_BASS.length;
      const interval = BATTLE_BASS[bassIndex] ?? 0;
      this.bass(bus, midiToFrequency(root + interval), when, sixteenth * 1.45, 0.075);
    }

    const arpIndex = step % BATTLE_ARP.length;
    const degree = BATTLE_ARP[arpIndex] ?? 0;
    const note = (chord[degree % chord.length] ?? chord[0]!) + 12;
    this.pluck(bus, midiToFrequency(note), when, sixteenth * 0.9, 0.022 * randomIdle());

    if (step % 32 === 0) {
      this.noise(bus, {
        duration: 0.26,
        gain: 0.03,
        filter: 900,
        q: 0.5,
        when,
      });
    }
  }

  private tone(
    bus: GainNode,
    options: {
      freq: number;
      to?: number;
      duration: number;
      type?: OscillatorType;
      gain: number;
      when?: number;
      filter?: number;
    },
  ): void {
    const context = this.context;
    if (context === null) return;
    const start = (options.when ?? 0) + context.currentTime;
    const end = start + options.duration;
    const osc = context.createOscillator();
    const gain = context.createGain();

    osc.type = options.type ?? 'sine';
    osc.frequency.setValueAtTime(Math.max(20, options.freq), start);
    if (options.to !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, options.to), end);
    }

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, options.gain), start + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);

    let output: AudioNode = gain;
    if (options.filter !== undefined) {
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = options.filter;
      gain.connect(filter);
      output = filter;
    }

    osc.connect(gain);
    output.connect(bus);
    osc.start(start);
    osc.stop(end + 0.02);
  }

  private noise(
    bus: GainNode,
    options: {
      duration: number;
      gain: number;
      filter: number;
      q: number;
      when?: number;
      type?: BiquadFilterType;
      attack?: number;
    },
  ): void {
    const context = this.context;
    const buffer = this.noiseBuffer;
    if (context === null || buffer === null) return;

    const start = (options.when ?? 0) + context.currentTime;
    const end = start + options.duration;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();

    source.buffer = buffer;
    source.loop = true;
    filter.type = options.type ?? 'lowpass';
    filter.frequency.value = options.filter;
    filter.Q.value = options.q;

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(
      Math.max(0.0002, options.gain),
      start + (options.attack ?? 0.008),
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, end);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(bus);
    source.start(start);
    source.stop(end + 0.03);
  }

  private pad(bus: GainNode, frequency: number, when: number, duration: number, gainValue: number): void {
    const context = this.context;
    if (context === null) return;
    const start = when + context.currentTime;
    const end = start + duration;
    const gain = context.createGain();
    const filter = context.createBiquadFilter();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(gainValue, start + duration * 0.35);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    filter.type = 'lowpass';
    filter.frequency.value = 1100;
    filter.Q.value = 0.6;
    gain.connect(filter);
    filter.connect(bus);

    for (const detune of [-7, 7]) {
      const osc = context.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = frequency;
      osc.detune.value = detune;
      osc.connect(gain);
      osc.start(start);
      osc.stop(end + 0.03);
    }
  }

  private bass(bus: GainNode, frequency: number, when: number, duration: number, gainValue: number): void {
    const context = this.context;
    if (context === null) return;
    const start = when + context.currentTime;
    const end = start + duration;
    const osc = context.createOscillator();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();
    osc.type = 'triangle';
    osc.frequency.value = frequency;
    filter.type = 'lowpass';
    filter.frequency.value = 520;
    filter.Q.value = 0.7;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.connect(gain);
    gain.connect(filter);
    filter.connect(bus);
    osc.start(start);
    osc.stop(end + 0.02);
  }

  private pluck(bus: GainNode, frequency: number, when: number, duration: number, gainValue: number): void {
    const context = this.context;
    if (context === null) return;
    const start = when + context.currentTime;
    const end = start + duration;
    const osc = context.createOscillator();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();
    osc.type = 'triangle';
    osc.frequency.value = frequency;
    filter.type = 'lowpass';
    filter.frequency.value = 2200;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.connect(gain);
    gain.connect(filter);
    filter.connect(bus);
    osc.start(start);
    osc.stop(end + 0.02);
  }

  private kick(bus: GainNode, when: number, gainValue: number): void {
    const context = this.context;
    if (context === null) return;
    const start = when + context.currentTime;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(130, start);
    osc.frequency.exponentialRampToValueAtTime(44, start + 0.16);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.2);
    osc.connect(gain);
    gain.connect(bus);
    osc.start(start);
    osc.stop(start + 0.22);
  }

  private arp(
    bus: GainNode,
    notes: readonly number[],
    spacing: number,
    gainValue: number,
    type: OscillatorType,
    filter?: number,
  ): void {
    notes.forEach((note, index) => {
      this.tone(bus, {
        freq: midiToFrequency(note),
        duration: spacing * 1.4,
        type,
        gain: gainValue,
        when: index * spacing,
        filter,
      });
    });
  }

  private resetSweep(bus: GainNode): void {
    for (let index = 0; index < 6; index += 1) {
      this.tone(bus, {
        freq: 1100 - index * 150,
        to: 520 - index * 55,
        duration: 0.035,
        type: 'square',
        gain: 0.055,
        when: index * 0.035,
        filter: 3600,
      });
    }
    this.noise(bus, { duration: 0.2, gain: 0.08, filter: 1800, q: 1.2, when: 0.08 });
  }
}
