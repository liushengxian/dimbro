# dimbro

DimAgent 程序员 vs. 失控构建空间。俯视角自动射击 Roguelite Web Demo。

设计基线见 [docs/game-design.md](docs/game-design.md)（v0.4）。当前实现覆盖 **M0–M5**：首页、选程序员、8 波战斗、属性升级、商店、Boss 与胜负结算、存档继续；M6 已接入程序化背景音乐与音效（默认关闭），震屏与粒子打磨仍在持续。

## 运行

```bash
npm install
npm run dev
```

默认地址为 Vite 输出的本地地址。构建与检查：

```bash
npm run typecheck
npm test
npm run build
```

## 操作

- `WASD` / 方向键：移动
- 自动攻击，无需瞄准
- `Esc` / `P`：暂停 / 继续
- 菜单：鼠标点击或 `Tab` + `Enter`；选角页可用 `Enter` 直接开始
- 升级页可用数字键 `1`–`3` 快速选择
- 音频默认关闭；首页右上角、设置与暂停菜单可分别开启背景音乐和音效

最低支持 1280×720；更小窗口会显示扩大窗口提示。

## 已实现

- v0.4 角色数据：夕阳针、Simon、Junyi 禁用占位
- 5 把武器与自动索敌、穿透、回旋、近战、散射
- 5 类敌人 + 监工精英 + 熔炉核心 Boss（三技能、二阶段、60 秒软狂暴）
- 夕阳针 RESET / 光轨追焦；Simon 溢伤弹射 / 波末自动回收金币与维修护盾
- 18 张升级卡（12 纯正面 + 6 风险）、10 个商店模块、4 商品商店、刷新、出售、满槽替换
- 8 波编排、金币结算、升级三选一、商店闭环
- 波次开始 / 离开商店存档，首页继续任务；胜利 / 失败清除存档
- 1280×720 至 1920×1080、DPR 2 的 Canvas 战斗渲染
- 程序化背景音乐与 20+ 战斗 / 流程音效，默认关闭，可独立开关并持久化
- 程序化工厂背景、角色 SVG、全部菜单与 HUD
- 排行榜：Supabase 在线榜 + 未配置时的本地回退榜

## 部署

GitHub Pages 使用 GitHub Actions 构建并发布 `dist/`：

- 站点：https://liushengxian.github.io/dimbro/
- 工作流：[.github/workflows/deploy.yml](.github/workflows/deploy.yml)
- 生产构建的 Vite `base` 为 `/dimbro/`，本地开发仍使用 `/`

每次推送到 `main` 会自动测试、构建并部署。

## 排行榜（Supabase，可选）

首页与结算页都有排行榜入口。未配置 Supabase 时自动使用 `localStorage` 本地榜，方便开发和离线预览；配置后切换为在线榜。

### 1. 建表

在 Supabase Dashboard → SQL Editor 中执行 [supabase/leaderboard.sql](supabase/leaderboard.sql)。脚本会创建：

- `public.leaderboard` 表与排名索引
- 由数据库计算 `score` 的 generated column
- RLS：anon 只能 `SELECT` / `INSERT`，不能修改或删除

### 2. 本地配置

在 Supabase → Project Settings → API 复制 Project URL 与 anon public key：

```bash
cp .env.example .env.local
```

填入：

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

anon key 会打包进前端，这是 Supabase 的预期用法；**不要**使用 `service_role` key。权限由 RLS 控制。

### 3. GitHub Pages

在仓库 Settings → Secrets and variables → Actions 添加同名的两个 secrets。部署工作流会把它们注入 `npm run build`；未配置时构建仍成功，排行榜保持本地模式。

### 计分与安全

- 战绩分 = 通关奖励 10,000,000 + 波次 × 1,000,000 + min(击杀, 999) × 1,000 + min(伤害 / 1000, 999)。排序为分数降序、用时升序。
- 客户端只提交原始战绩，`score` 由 Postgres 计算；`CHECK` 约束限制波次 1–8、昵称 1–16 字符、击杀 / 伤害 / 用时范围。
- 单机浏览器游戏无法彻底防作弊：有能力的玩家仍能伪造“看起来合理”的原始战绩。正式运营建议把写入改为 Supabase Edge Function，做服务端校验、账号或 IP 限流；也可以换成 Cloudflare Workers + D1 / KV、Firebase Firestore 等免费方案。

## 调试

访问 `?debug=1` 会显示 FPS、波次、实体数与 RNG 种子，并暴露 `window.__dimbro`：

```js
__dimbro.jumpToWave(8);
__dimbro.addCoins(100);
__dimbro.finishWave();
__dimbro.setBossHp(0.49);
__dimbro.setBossElapsed(61);
__dimbro.triggerReset();
```

调试接口只在 `?debug=1` 时挂载。

## 结构

```text
src/
  app/              React 外壳、页面状态机、首页/选角/战斗 HUD/升级/商店/结算
  game/
    core/           RNG 等纯逻辑
    data/           角色、武器、升级、模块、敌人、波次、数值
    systems/        属性、战斗、商店、升级
    renderer.ts     Canvas 2D 战斗渲染
    session.ts      对 UI 暴露的会话门面
    types.ts        共享类型与快照
  styles/           设计 token、全局样式与页面样式
scripts/            无头 Chrome 视觉与流程冒烟脚本
supabase/           排行榜建表与 RLS SQL
docs/               游戏设计文档
```

## 冒烟脚本

先启动开发服务器，再运行：

```bash
node scripts/visual-smoke.mjs
node scripts/flow-smoke.mjs
node scripts/character-smoke.mjs
node scripts/replace-smoke.mjs
```

脚本使用本机 Chrome（可用 `CHROME_PATH` 指定）和 `playwright-core`，截图输出到 `/tmp/dimbro-*.png`。

## 尚未完成 / 已知取舍

- M6：WebAudio 音效、震屏、粒子与低血量反馈的进一步打磨。音效 / 震屏开关已持久化，但当前没有实际音频。
- 商店在 4 槽已满时仍可能刷出未拥有武器，以便进入“替换槽位”流程；这与设计文档“满槽后不再生成未拥有武器”的表述存在取舍，优先保证替换流程可达。
- 精英 / Boss 的成长系数与部分描述性数值按可玩性做了执行层取舍，后续可结合试玩调整。
- 排行榜为匿名写入的 Demo 级实现，没有账号体系、服务端战绩复核与强反作弊；正式运营前应改为 Edge Function 或独立后端。
