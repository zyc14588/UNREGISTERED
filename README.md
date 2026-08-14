# OpenCode TRPG Sandbox + Rules Design Skill Pack

专门用于 **长战役 + 开放式世界 TRPG + 自制规则系统设计** 的 OpenCode Skill Pack。

叙事侧核心模型：

> **World State → Pressures → Actors → Situations → Player Choices → Consequences → State Update**

规则侧核心模型：

> **Design Pillars → Prototype → Math Check → Playtest → Revision → Canon → Campaign Adaptation**

玩家不是被剧情树消费的输入；规则也不是一次写完的百科全书。世界与规则都通过小步、可验证的状态变化迭代。

## 安装

把本包中的 `.opencode/skills/` 整个复制到项目根目录：

```text
YOUR_CAMPAIGN/
├── .opencode/
│   └── skills/
│       └── ...
├── campaign/
└── AGENTS.md        # 可选；参考 AGENTS.example.md
```

## 25 个 Skill

### A. 长战役 / 沙盒创作（14）

| Skill | 主要职责 |
|---|---|
| `trpg-campaign-director` | 总控、路由、战役健康与反铁路审查 |
| `campaign-state-keeper` | Canon、时间线、赛后差分、连续性 |
| `sandbox-world-engine` | 地区、旅行网络、开放世界扩展 |
| `faction-simulator` | 派系目标、Clock、幕后推进与碰撞 |
| `npc-web` | NPC 向量、关系网、知识边界、活动日志 |
| `situation-designer` | 以 Situation 取代线性剧情章节 |
| `location-site-designer` | 可重入地点、非线性 Site/地城/Hub |
| `mystery-clue-engine` | 真相、Revelation Matrix、冗余线索 |
| `quest-designer` | 开放式任务、委托、任务链与状态分支 |
| `encounter-situation-designer` | 目标驱动的战斗/社交/探索遭遇 |
| `improv-oracle` | 玩家跑偏时的低成本、canon-safe 即兴 |
| `dialogue-voice` | NPC 声音、谈判、审问、可打断演说 |
| `trpg-prose-writer` | GM 参考模式 vs 玩家文学模式 |
| `session-prep-recap` | 5–7 张场景菜单、强开场、赛后 recap |

### B. 自制规则设计（10）

| Skill | 主要职责 |
|---|---|
| `trpg-system-designer` | 规则设计总控、设计支柱、生命周期与路由 |
| `core-resolution-designer` | 核心判定、成功层级、难度、修正与失败后果 |
| `probability-balance-lab` | 精确概率、骰池曲线、期望值与敏感度 |
| `character-progression-designer` | 角色创建、属性技能、职业/原型与长期成长 |
| `conflict-engine-designer` | 战斗、行动经济、伤害、追逐与社交冲突 |
| `resource-economy-designer` | HP/Stress/体力/弹药/元货币/恢复/停机循环 |
| `gm-procedure-designer` | 探索、旅行、调查、停机、派系等可重复 procedure |
| `rules-content-forge` | 能力、装备、敌人、危险与统一内容模板 |
| `playtest-rules-auditor` | 测试假设、漏洞、平衡、认知负担与回归 |
| `rules-reference-writer` | 规则书、术语、示例、速查与迁移说明 |

### C. 规则落地桥接（1）

| Skill | 主要职责 |
|---|---|
| `rules-system-adapter` | 把 CANON/明确测试中的规则映射到战役内容 |

## 自制规则筹备期推荐工作流

### 1. 先定“玩什么”，不先定“用什么骰”

```text
trpg-system-designer
  → campaign/rules/design-pillars.md
  → campaign/rules/mechanics-ledger.md
```

先确定目标体验、主要玩家循环、复杂度预算和明确 non-goals。

### 2. 做最小可玩核心

```text
core-resolution-designer
  → probability-balance-lab
  → character-progression-designer
  → resource-economy-designer
  → conflict-engine-designer
  → gm-procedure-designer
```

目标不是完整规则书，而是能让 4 个预制角色跑一次 2–4 小时测试局。

### 3. 桌测以后再扩内容

```text
playtest-rules-auditor
  → 找根因
  → 修改 1–3 个机制/参数
  → probability-balance-lab（如果涉及数学）
  → 再测试
```

核心循环稳定后再用 `rules-content-forge` 批量写职业能力、装备、敌人等。

### 4. 正式采用

```text
rules-reference-writer
  → 将机制整理为可运行文本
  → 在 mechanics-ledger 标 CANON
  → rules-changelog
  → rules-system-adapter
```

只有 CANON 或用户明确指定的 PLAYTEST 规则能进入正式战役数值。

## 长战役创作工作流

### 建团 / 战役初始化

```text
trpg-campaign-director
  → sandbox-world-engine
  → faction-simulator
  → npc-web
  → situation-designer
  → campaign-state-keeper
```

### Session 前

```text
session-prep-recap
  → encounter-situation-designer
  → dialogue-voice
  → rules-system-adapter（仅引用当前允许的规则版本）
```

### 玩家突然跑偏

```text
improv-oracle
  → 只生成今晚够用的信息
  → 记录 provisional canon
```

### Session 后

```text
session-prep-recap (RECAP)
  → campaign-state-keeper
  → faction-simulator
  → campaign-state-keeper
```

## Campaign / Rules 目录

新增规则设计文件：

- `rules/design-pillars.md` — 目标体验与复杂度预算；
- `rules/mechanics-ledger.md` — 所有机制的生命周期索引；
- `rules/probability-targets.md` — 目标感觉与精确概率；
- `rules/playtest-log.md` — 测试假设与观测；
- `rules/terminology.md` — 正式术语；
- `rules/rules-changelog.md` — CANON 规则变化；
- `rules/system-notes.md` — 当前系统版本与适配入口。

## 规则生命周期

```text
IDEA → PROPOSAL → PROTOTYPE → PLAYTEST → CANON → DEPRECATED
```

草案不是正式规则。尤其在你当前筹备期，OpenCode 应该可以大胆提出方案，但必须把“方案”和“已采用规则”分开。

## 数学工具

`probability-balance-lab` 自带一个无第三方依赖的 Python 概率脚本：

```bash
python .opencode/skills/probability-balance-lab/scripts/dice_prob.py sum \
  --dice 2 --sides 6 --bonus 1 --target 9

python .opencode/skills/probability-balance-lab/scripts/dice_prob.py pool \
  --dice 5 --sides 6 --success-at 5 --required 2

python .opencode/skills/probability-balance-lab/scripts/dice_prob.py highest \
  --dice 3 --sides 6 --partial-at 4 --full-at 6
```

先算准，再桌测；不要凭直觉调骰率。

## 最重要的设计纪律

### 战役

1. Pressures, not plots.
2. PC boundary.
3. Independent actor agency.
4. If Ignored.
5. Canon ≠ Prep.
6. Redundant clues.
7. Revisit changes.
8. Prep near, sketch far.
9. Table utility before literary polish.

### 规则

1. Experience before mechanics.
2. One core mechanic should earn repeated use.
3. Procedures for recurring play.
4. Math facts ≠ feel targets.
5. Shared templates/tags before special cases.
6. Growth should change decisions, not only numbers.
7. Every resource needs source / sink / cap / refresh / pressure.
8. Test actual table behavior, not only spreadsheets.
9. Fix root causes with small changes.
10. Only confirmed rules become CANON.

## OpenCode 提示示例

```text
加载 trpg-system-designer。帮我从零建立这套自制 TRPG 的 design pillars；暂时不要选骰型，先定义目标体验、核心循环、复杂度预算和 non-goals。
```

```text
加载 core-resolution-designer 和 probability-balance-lab。比较 2d6+属性、d20 roll-over、Xd6 取最高三种判定框架；目标是“专业角色稳定，但高压行动仍有明显风险”。所有概率都算出来。
```

```text
加载 playtest-rules-auditor。根据 campaign/rules/playtest-log.md，把上次测试问题归因；只提出最多三项规则改动，并列出每项需要回归测试什么。
```

```text
加载 trpg-campaign-director。基于 campaign/state/world-state.yaml，检查当前沙盒是否存在隐性铁路，并提出三项最优先修复。
```

## 兼容性设计

本包使用 `.opencode/skills/<name>/SKILL.md` 目录形式；frontmatter 使用 OpenCode 当前识别的标准字段，Skill 名使用 lowercase-kebab 格式。各 Skill 按需加载，避免把整套规则与战役知识一次塞进上下文。
