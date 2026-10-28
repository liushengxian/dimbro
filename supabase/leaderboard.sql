-- dimbro 排行榜 · Supabase / PostgreSQL
--
-- 在 Supabase Dashboard → SQL Editor 中整段执行。
-- 客户端只使用 Project URL + anon public key；不要在前端使用 service_role key。
--
-- 安全模型（Demo 级）：
--   * anon 只能 SELECT / INSERT，不能 UPDATE / DELETE。
--   * score 由数据库 generated column 计算，客户端无法直接写分数。
--   * CHECK 约束限制波次、击杀、伤害、用时和昵称长度。
--   * 这仍然无法阻止有能力的玩家伪造“看起来合理”的原始战绩。
--     正式运营建议改为 Supabase Edge Function：服务端校验 + IP/账号限流。

create table if not exists public.leaderboard (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  nickname text not null,
  character_id text not null,
  victory boolean not null default false,
  wave smallint not null,
  kills integer not null default 0,
  damage bigint not null default 0,
  elapsed_seconds integer not null default 0,
  score bigint generated always as (
    (case when victory then 10000000 else 0 end)::bigint
    + wave::bigint * 1000000
    + least(kills, 999)::bigint * 1000
    + least(floor(damage / 1000.0), 999)::bigint
  ) stored,
  constraint leaderboard_nickname_check check (
    nickname = btrim(nickname)
    and char_length(nickname) between 1 and 16
    and nickname !~ '[[:cntrl:]]'
  ),
  constraint leaderboard_character_check check (character_id in ('sunsetNeedle', 'simon')),
  constraint leaderboard_wave_check check (wave between 1 and 8),
  constraint leaderboard_victory_wave_check check (not victory or wave = 8),
  constraint leaderboard_kills_check check (kills between 0 and 100000),
  constraint leaderboard_damage_check check (damage between 0 and 100000000000),
  constraint leaderboard_elapsed_check check (elapsed_seconds between 0 and 86400)
);

create index if not exists leaderboard_rank_idx
  on public.leaderboard (score desc, elapsed_seconds asc, created_at asc);

alter table public.leaderboard enable row level security;

drop policy if exists "leaderboard public read" on public.leaderboard;
create policy "leaderboard public read"
  on public.leaderboard
  for select
  to anon, authenticated
  using (true);

drop policy if exists "leaderboard public insert" on public.leaderboard;
create policy "leaderboard public insert"
  on public.leaderboard
  for insert
  to anon, authenticated
  with check (true);

-- 不创建 UPDATE / DELETE 策略，匿名客户端无法修改或删除榜单。
revoke update, delete, truncate on public.leaderboard from anon, authenticated;
grant select, insert on public.leaderboard to anon, authenticated;
grant usage, select on sequence public.leaderboard_id_seq to anon, authenticated;

comment on table public.leaderboard is
  'dimbro leaderboard. score is server-computed; anon can read and insert only.';
