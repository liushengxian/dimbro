import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import type { JSX } from 'react';
import './../styles/app.css';
import { CHARACTERS_BY_ID } from '../game/data/characters';
import { GameSession } from '../game/session';
import { GameAudio } from '../game/audio';
import type { SessionSnapshot } from '../game/types';
import {
  SAVE_KEY,
  clearSave,
  hasSeenIntro,
  markIntroSeen,
  readSave,
  readSettings,
  writeSettings,
} from './lib/storage';
import {
  initialScreenState,
  screenReducer,
} from './state/screenMachine';
import { HomeScreen } from './screens/HomeScreen';
import { CharacterSelectScreen } from './screens/CharacterSelectScreen';
import { BattleScreen } from './screens/BattleScreen';
import { WaveClearScreen } from './screens/WaveClearScreen';
import { UpgradeScreen } from './screens/UpgradeScreen';
import { ShopScreen } from './screens/ShopScreen';
import { ResultScreen } from './screens/ResultScreen';

function createSession(): GameSession {
  return new GameSession();
}

function readSaveStatus() {
  const save = readSave();
  if (save) return { save, corrupted: false };
  try {
    const raw = globalThis.localStorage?.getItem(SAVE_KEY) ?? null;
    return { save: null, corrupted: raw !== null };
  } catch {
    return { save: null, corrupted: false };
  }
}

export function App(): JSX.Element {
  const sessionRef = useRef<GameSession | null>(null);
  if (sessionRef.current === null) {
    sessionRef.current = createSession();
  }
  const session = sessionRef.current;
  const audioRef = useRef<GameAudio | null>(null);
  if (audioRef.current === null) {
    audioRef.current = new GameAudio();
  }
  const audio = audioRef.current;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [screenState, dispatch] = useReducer(screenReducer, initialScreenState);
  const [settings, setSettings] = useState(readSettings);
  const [saveStatus, setSaveStatus] = useState(readSaveStatus);
  const save = saveStatus.save;
  const [introSeen, setIntroSeen] = useState(hasSeenIntro);
  const snapshot = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  const isDebug = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).has('debug');
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) session.attachCanvas(canvas);
    return () => session.destroy();
  }, [session]);

  useEffect(() => {
    audio.configure({ music: settings.music, sound: settings.sound });
  }, [audio, settings.music, settings.sound]);

  useEffect(() => {
    session.setAudioListener((cue) => audio.play(cue));
    return () => session.setAudioListener(null);
  }, [audio, session]);

  useEffect(() => {
    audio.setScene(screenState.screen === 'battle' ? 'battle' : 'menu');
    audio.setPaused(screenState.screen === 'battle' && snapshot.paused);
  }, [audio, screenState.screen, snapshot.paused]);

  useEffect(() => () => audio.dispose(), [audio]);

  const refreshSave = useCallback(() => {
    setSaveStatus(readSaveStatus());
  }, []);

  const handleClearCorruptedSave = useCallback(() => {
    clearSave();
    refreshSave();
  }, [refreshSave]);

  useEffect(() => {
    if (screenState.screen === 'battle') {
      if (snapshot.phase === 'waveClear') {
        dispatch({ type: 'WAVE_CLEAR' });
      } else if (snapshot.phase === 'victory' || snapshot.phase === 'defeat') {
        refreshSave();
        dispatch({ type: 'SHOW_RESULT' });
      }
    }
    if (snapshot.phase === 'victory' || snapshot.phase === 'defeat') {
      refreshSave();
    }
  }, [refreshSave, screenState.screen, snapshot.phase]);

  useEffect(() => {
    if (!isDebug) return;
    const debugApi = {
      session,
      snapshot: () => session.getSnapshot(),
      jumpToWave: (wave: number) => {
        session.debugJumpToWave(wave);
        refreshSave();
      },
      finishWave: () => session.debugFinishWave(),
      addCoins: (amount: number) => session.debugAddCoins(amount),
      setBossHp: (fraction: number) => session.debugSetBossHp(fraction),
      setBossElapsed: (seconds: number) => session.debugSetBossElapsed(seconds),
      triggerReset: () => session.debugTriggerReset(),
    };
    (window as unknown as { __dimbro?: typeof debugApi }).__dimbro = debugApi;
    return () => {
      delete (window as unknown as { __dimbro?: typeof debugApi }).__dimbro;
    };
  }, [isDebug, refreshSave, session]);

  const updateSettings = useCallback((partial: Partial<typeof settings>) => {
    setSettings((current) => {
      const next = { ...current, ...partial };
      writeSettings(next);
      return next;
    });
  }, []);

  const saveSummary = useMemo(() => {
    if (!save) return null;
    return {
      characterName: CHARACTERS_BY_ID[save.run.characterId].name,
      wave: save.run.wave,
    };
  }, [save]);

  const handleStartMission = useCallback(() => {
    dispatch({ type: 'START_MISSION' });
  }, []);

  const handleContinue = useCallback(() => {
    const saved = readSave();
    if (!saved) {
      refreshSave();
      return;
    }
    session.continueRun(saved);
    dispatch({ type: 'CONTINUE_RUN' });
    refreshSave();
  }, [refreshSave, session]);

  const handleCharacterStart = useCallback(
    (characterId: 'sunsetNeedle' | 'simon') => {
      session.startNewRun(characterId);
      dispatch({ type: 'START_BATTLE' });
      refreshSave();
    },
    [refreshSave, session],
  );

  const handleBackHome = useCallback(() => {
    session.returnHome();
    dispatch({ type: 'BACK_HOME' });
    refreshSave();
  }, [refreshSave, session]);

  const handleBeginUpgrade = useCallback(() => {
    session.beginUpgrade();
    dispatch({ type: 'BEGIN_UPGRADE' });
  }, [session]);

  const handleChooseUpgrade = useCallback(
    (id: Parameters<GameSession['chooseUpgrade']>[0]) => {
      session.chooseUpgrade(id);
      dispatch({ type: 'OPEN_SHOP' });
    },
    [session],
  );

  const handleSkipUpgrade = useCallback(() => {
    session.skipUpgrade();
    dispatch({ type: 'OPEN_SHOP' });
  }, [session]);

  const handleNextWave = useCallback(() => {
    session.nextWave();
    dispatch({ type: 'NEXT_WAVE' });
    refreshSave();
  }, [refreshSave, session]);

  const handleRestart = useCallback(() => {
    session.restartSameCharacter();
    refreshSave();
  }, [refreshSave, session]);

  const handlePlayAgain = useCallback(() => {
    const result = session.getSnapshot().result;
    if (!result) return;
    session.startNewRun(result.characterId);
    refreshSave();
    dispatch({ type: 'START_BATTLE' });
  }, [refreshSave, session]);

  const handleIntroSeen = useCallback(() => {
    markIntroSeen();
    setIntroSeen(true);
  }, []);

  const waveSummary = snapshot.waveSummary;
  const character = snapshot.run ? CHARACTERS_BY_ID[snapshot.run.characterId] : null;
  const canvasHidden =
    screenState.screen === 'home' || screenState.screen === 'characterSelect';

  return (
    <div className="app-shell" data-screen={screenState.screen}>
      <div className="ui-viewport-warning" role="alert">
        <div className="ui-viewport-warning__card">
          <h1>终端视口过窄</h1>
          <p>请将窗口扩大到至少 1280 × 720，构建空间的 HUD 才能完整展开。</p>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        className="game-canvas"
        data-hidden={canvasHidden || undefined}
        aria-hidden="true"
      />

      {screenState.screen === 'home' && saveStatus.corrupted ? (
        <div className="save-corruption" role="alert">
          <span>
            <strong>存档损坏。</strong>
            检测到无法解析的本地存档，已阻止继续任务。
          </span>
          <button type="button" onClick={handleClearCorruptedSave}>
            清除损坏存档
          </button>
        </div>
      ) : null}

      {screenState.screen === 'home' ? (
        <HomeScreen
          hasSave={save !== null}
          saveSummary={saveSummary}
          musicEnabled={settings.music}
          soundEnabled={settings.sound}
          shakeEnabled={settings.shake}
          showIntroOnMount={!introSeen}
          onStart={handleStartMission}
          onContinue={handleContinue}
          onMusicChange={(music) => updateSettings({ music })}
          onSoundChange={(sound) => updateSettings({ sound })}
          onShakeChange={(shake) => updateSettings({ shake })}
          onIntroSeen={handleIntroSeen}
        />
      ) : null}

      {screenState.screen === 'characterSelect' ? (
        <CharacterSelectScreen
          initialCharacterId={save?.run.characterId ?? 'sunsetNeedle'}
          hasSave={save !== null}
          saveSummary={saveSummary}
          onBack={handleBackHome}
          onStart={handleCharacterStart}
        />
      ) : null}

      {screenState.screen === 'battle' ? (
        <BattleScreen
          snapshot={snapshot}
          musicEnabled={settings.music}
          soundEnabled={settings.sound}
          shakeEnabled={settings.shake}
          onPause={() => session.pause()}
          onResume={() => session.resume()}
          onRestart={handleRestart}
          onHome={handleBackHome}
          onMusicChange={(music) => updateSettings({ music })}
          onSoundChange={(sound) => updateSettings({ sound })}
          onShakeChange={(shake) => updateSettings({ shake })}
        />
      ) : null}

      {screenState.screen === 'waveClear' && waveSummary ? (
        <WaveClearScreen
          summary={waveSummary}
          characterName={character?.name ?? '程序员'}
          onContinue={handleBeginUpgrade}
        />
      ) : null}

      {screenState.screen === 'upgrade' ? (
        <UpgradeScreen
          choices={snapshot.upgradeChoices}
          coins={snapshot.coins}
          wave={snapshot.wave}
          onChoose={handleChooseUpgrade}
          onSkip={handleSkipUpgrade}
        />
      ) : null}

      {screenState.screen === 'shop' ? (
        <ShopScreen
          snapshot={snapshot}
          onBuy={(offerId) => session.buyOffer(offerId)}
          onRefresh={() => session.refreshShop()}
          onSell={(slotIndex) => session.sellWeapon(slotIndex)}
          onReplace={(slotIndex) => session.replaceWeapon(slotIndex)}
          onCancelPending={() => session.cancelPendingPurchase()}
          onNextWave={handleNextWave}
        />
      ) : null}

      {screenState.screen === 'result' && snapshot.result ? (
        <ResultScreen
          result={snapshot.result}
          onRestart={handlePlayAgain}
          onHome={handleBackHome}
        />
      ) : null}

      {isDebug ? <DebugOverlay snapshot={snapshot} /> : null}
    </div>
  );
}

function DebugOverlay({ snapshot }: { snapshot: SessionSnapshot }): JSX.Element {
  return (
    <aside className="debug-overlay" aria-label="调试信息">
      <span>FPS {snapshot.debug.fps}</span>
      <span>PHASE {snapshot.phase}</span>
      <span>WAVE {snapshot.debug.wave}</span>
      <span>ENEMY {snapshot.debug.enemies}</span>
      <span>BULLET {snapshot.debug.playerProjectiles}/{snapshot.debug.enemyProjectiles}</span>
      <span>SPAWNS {snapshot.debug.spawnRemaining}</span>
      <span>SEED {snapshot.debug.seed}</span>
      <span>[?debug=1]</span>
    </aside>
  );
}
