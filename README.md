# dimbro

DimAgent 程序员 vs. 失控构建空间。俯视角自动射击 Roguelite Web Demo。

设计基线见 [docs/game-design.md](docs/game-design.md)（v0.4）。当前实现覆盖 **M0–M5**：首页、选程序员、8 波战斗、属性升级、商店、Boss 与胜负结算、存档继续；M6 的程序化音效、震屏与更细的粒子打磨尚未接入。

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

最低支持 1280×720；更小窗口会显示扩大窗口提示。

## 已实现

- v0.4 角色数据：夕阳针、Simon、Junyi 禁用占位
- 5 把武器与自动索敌、穿透、回旋、近战、散射
- 5 类敌人 + 监工精英 + 熔炉核心 Boss（三技能、二阶段、60 秒软狂暴）
- 夕阳针 RESET / 光轨追焦；Simon 溢伤弹射 / 波末自动回收金币与维修护盾
- 12 张升级卡、10 个商店模块、4 商品商店、刷新、出售、满槽替换
- 8 波编排、金币结算、升级三选一、商店闭环
- 波次开始 / 离开商店存档，首页继续任务；胜利 / 失败清除存档
- 1280×720 至 1920×1080、DPR 2 的 Canvas 战斗渲染
- 程序化工厂背景、角色 SVG、全部菜单与 HUD

## 部署

GitHub Pages 使用 GitHub Actions 构建并发布 `dist/`：

- 站点：https://liushengxian.github.io/dimbro/
- 工作流：[.github/workflows/deploy.yml](.github/workflows/deploy.yml)
- 生产构建的 Vite `base` 为 `/dimbro/`，本地开发仍使用 `/`

每次推送到 `main` 会自动测试、构建并部署。

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
