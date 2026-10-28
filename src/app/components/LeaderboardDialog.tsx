import { useEffect, useState, type FormEvent, type JSX } from 'react';
import { CHARACTERS_BY_ID } from '../../game/data/characters';
import type { ResultView } from '../../game/types';
import {
  buildSubmission,
  getLeaderboardSource,
  hasSubmittedFingerprint,
  loadLeaderboard,
  markFingerprintSubmitted,
  normalizeNickname,
  readNickname,
  resultFingerprint,
  submitLeaderboard,
  writeNickname,
  type LeaderboardEntry,
} from '../lib/leaderboard';
import { Button } from './Button';
import { Icon } from './Icon';
import { Modal } from './Modal';
import '../../styles/leaderboard.css';

export interface LeaderboardDialogProps {
  open: boolean;
  result?: ResultView | null;
  onClose: () => void;
}

const NUMBER_FORMAT = new Intl.NumberFormat('zh-CN');

function formatNumber(value: number): string {
  return NUMBER_FORMAT.format(Math.round(value));
}

function formatTime(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (safe % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '排行榜请求失败，请稍后重试。';
}

export function LeaderboardDialog({
  open,
  result = null,
  onClose,
}: LeaderboardDialogProps): JSX.Element {
  const source = getLeaderboardSource();
  const fingerprint = result === null ? null : resultFingerprint(result);

  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [nickname, setNickname] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    loadLeaderboard()
      .then((items) => {
        if (!cancelled) setEntries(items);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(errorMessage(reason));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, reloadKey]);

  useEffect(() => {
    if (!open) return;

    setNickname(readNickname());
    setSubmitError(null);
    setNotice(null);
    setHighlightId(null);
    setSubmitted(fingerprint !== null && hasSubmittedFingerprint(fingerprint));
  }, [open, fingerprint]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (result === null || fingerprint === null || submitting) return;

    const normalized = normalizeNickname(nickname);
    if (normalized.length === 0) {
      setSubmitError('请输入 1–16 个字符的署名。');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setNotice(null);

    try {
      const entry = await submitLeaderboard(buildSubmission(result, normalized));
      writeNickname(normalized);
      markFingerprintSubmitted(fingerprint);
      setNickname(normalized);
      setSubmitted(true);
      setHighlightId(entry.id);
      setNotice(source === 'remote' ? '战绩已上传到在线排行榜。' : '战绩已写入本地排行榜。');
      setReloadKey((value) => value + 1);
    } catch (reason: unknown) {
      setSubmitError(errorMessage(reason));
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit =
    fingerprint !== null &&
    result !== null &&
    !submitted &&
    !submitting &&
    normalizeNickname(nickname).length > 0;

  return (
    <Modal
      open={open}
      title="排行榜"
      eyebrow="BUILD RANKING // FIELD RECORDS"
      onClose={onClose}
      className="leaderboard-modal"
      footer={
        <Button variant="secondary" onClick={onClose}>
          关闭
        </Button>
      }
    >
      <div className="leaderboard">
        <div className="leaderboard__meta">
          <span className="leaderboard__mode" data-mode={source}>
            <i aria-hidden="true" />
            {source === 'remote' ? 'SUPABASE ONLINE' : 'LOCAL FALLBACK'}
          </span>
          <span className="leaderboard__count" aria-live="polite">
            {loading ? 'SYNCING…' : `${entries.length} RECORDS`}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="leaderboard__refresh"
            onClick={() => setReloadKey((value) => value + 1)}
            disabled={loading}
            leadingIcon={<Icon name="refresh" size={14} />}
          >
            刷新
          </Button>
        </div>

        {result !== null && fingerprint !== null ? (
          submitted ? (
            <p className="leaderboard__submitted">
              <Icon name="check" size={15} />
              本局战绩已上传
            </p>
          ) : (
            <form className="leaderboard__submit" onSubmit={handleSubmit}>
              <label className="leaderboard__field">
                <span>署名 // CALLSIGN</span>
                <input
                  className="leaderboard__input"
                  value={nickname}
                  onChange={(event) => setNickname(event.target.value)}
                  maxLength={16}
                  placeholder="输入 1–16 个字符"
                  autoComplete="nickname"
                />
              </label>
              <Button type="submit" variant="primary" disabled={!canSubmit}>
                {submitting ? '上传中…' : '上传本局'}
              </Button>
            </form>
          )
        ) : null}

        {submitError ? (
          <p className="leaderboard__error" role="alert">
            {submitError}
          </p>
        ) : null}
        {notice ? (
          <p className="leaderboard__notice" role="status">
            {notice}
          </p>
        ) : null}

        {error ? (
          <div className="leaderboard__error-block" role="alert">
            <p>{error}</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setReloadKey((value) => value + 1)}
            >
              重试
            </Button>
          </div>
        ) : loading ? (
          <div className="leaderboard__loading" aria-live="polite">
            <span />
            <span />
            <span />
            <p>正在同步构建日志…</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="leaderboard__empty">
            <span className="leaderboard__empty-code">NO RECORDS // 0x00</span>
            <p>还没有战绩。完成一局后上传，成为第一个留下签名的人。</p>
          </div>
        ) : (
          <div className="leaderboard__table-wrap">
            <table className="leaderboard__table">
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">程序员</th>
                  <th scope="col">战果</th>
                  <th scope="col">击杀</th>
                  <th scope="col">用时</th>
                  <th scope="col">伤害</th>
                  <th scope="col">战绩分</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, index) => {
                  const character = CHARACTERS_BY_ID[entry.characterId];
                  return (
                    <tr
                      key={entry.id}
                      data-rank={index + 1}
                      data-highlight={entry.id === highlightId || undefined}
                    >
                      <td className="leaderboard__rank">
                        {String(index + 1).padStart(2, '0')}
                      </td>
                      <td>
                        <span className="leaderboard__player">
                          <b title={entry.nickname}>{entry.nickname}</b>
                          <span>
                            {character.callsign} · {character.name}
                          </span>
                        </span>
                      </td>
                      <td>
                        <span
                          className="leaderboard__result"
                          data-victory={entry.victory || undefined}
                        >
                          {entry.victory ? '通关' : `第 ${entry.wave} 波`}
                        </span>
                      </td>
                      <td>{formatNumber(entry.kills)}</td>
                      <td>{formatTime(entry.elapsedSeconds)}</td>
                      <td>{formatNumber(entry.damage)}</td>
                      <td className="leaderboard__score">{formatNumber(entry.score)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="leaderboard__hint">
          排名规则：通关优先，其次波次、击杀、伤害；同分时用时更短者靠前。
          {source === 'local'
            ? ' 当前未连接 Supabase，战绩只保存在这台浏览器；配置环境变量后自动切换为在线榜。'
            : null}
        </p>
      </div>
    </Modal>
  );
}
