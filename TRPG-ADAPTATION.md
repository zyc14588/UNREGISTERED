# 从“小说家 + 游戏编剧”到“TRPG 长战役开放世界”的调整

## 核心模型替换

原本更适合小说/电子游戏的思路：

`Theme → Character Arc → Acts → Scenes → Branches → Ending`

改为更适合长期沙盒跑团的思路：

`World State → Pressures → Actors → Situations → Player Choices → Consequences → State Update`

## 原能力如何处理

| 原方向 | TRPG 沙盒版处理 | 原因 |
|---|---|---|
| Story Sense / 故事诊断 | 并入 `trpg-campaign-director` | 战役要诊断 choice density、railroad、dead threads，而不是只诊断戏剧弧线 |
| 三幕式 / Beat Sheet | 从核心移除 | 可用于单个 set piece，但不能统治开放世界战役 |
| Character Arc | 改为 `npc-web` + PC hooks/spotlight | NPC 有独立向量；PC 成长不能由 GM 预写 |
| Worldbuilding | 拆为 `sandbox-world-engine` + `faction-simulator` | 开放世界需要“会运行的世界”，不只是 lore |
| Interactive Fiction | 拆为 `situation-designer` + `campaign-state-keeper` | 不维护巨大选择树，维护状态、触发器和结果 |
| Quest Design | 保留并强化为 `quest-designer` | Quest 是 situation 的入口，不是一本道脚本 |
| Dialogue | 保留为 `dialogue-voice` | TRPG 需要可表演、可打断、受 NPC Knowledge 限制的对白 |
| Scene / Cinematic | 改为 `encounter-situation-designer` | 场景围绕目标、环境、升级与退场，不围绕固定结局 |
| Continuity | 提升为 `campaign-state-keeper` | 长战役的核心基础设施 |
| Revision / Notes | 分散到 director/state/prose 的质量门 | 更适合在每次更新时持续审查 |

## 新增的 TRPG 专属能力

### `location-site-designer`
解决开放世界最常见的“地点只有描述没有玩法”：多入口、环路、捷径、可互动环境、再访变化。

### `mystery-clue-engine`
解决调查因为一次失败检定、漏掉一个 NPC 或顺序错误而卡死的问题。

### `improv-oracle`
解决玩家绕开所有准备时，如何快速生成最小可用内容，同时不污染 canon。

### `session-prep-recap`
把长期 wiki 压缩成今晚桌上真正能用的一份操作文档；赛后再把事实写回长期状态。

### `rules-system-adapter`
让整个 Pack 保持系统无关。只有在知道实际 TRPG 规则后才补 DC、stat block、威胁等级等数值。

### `trpg-prose-writer`
强制区分 GM-facing 与 player-facing：GM 资料追求扫描效率，玩家文本才追求文学表现。

## 长战役必须维持的循环

```text
PREP
  world-state
    ↓
  active situations + faction pressure
    ↓
  session scene menu

PLAY
  player choices
    ↓
  improv when needed
    ↓
  provisional facts

POST
  factual recap
    ↓
  state delta
    ↓
  faction off-screen actions
    ↓
  updated world-state
    ↺
```

这个循环比“写完下一章”更适合数十甚至上百次 Session 的 campaign。
# v2.0 — 自制规则系统设计扩展

原版的 `rules-system-adapter` 只负责把既有规则映射到战役内容。对于“规则本身仍在创作”的项目，这不够，因此 v2.0 新增一个独立的规则设计层。

## 新增规则层的职责拆分

- `trpg-system-designer`：设计目标与路由，不直接包办所有细节；
- `core-resolution-designer`：最常用判定按钮；
- `probability-balance-lab`：数学事实与参数敏感度；
- `character-progression-designer`：角色身份与成长；
- `conflict-engine-designer`：高压冲突循环；
- `resource-economy-designer`：跨时间尺度资源；
- `gm-procedure-designer`：开放世界最重要的重复流程；
- `rules-content-forge`：基础稳定后再量产能力/装备/敌人；
- `playtest-rules-auditor`：用实际桌测驱动迭代；
- `rules-reference-writer`：把已验证设计变成可查阅规则。

`rules-system-adapter` 被重新定位为 **CANON 规则到战役内容的桥**，避免一个 Skill 同时“发明规则”和“假装这些规则已经正式采用”。

## 为什么适合长战役沙盒

自制规则不应和战役设计分离。旅行、探索、派系、资源、恢复、角色成长与冲突流程都会直接决定玩家在开放世界中愿意做什么。因此规则层强调 procedure、资源时间尺度、失败后状态变化、可退出冲突、GM 负担与长期成长，而不是只做战斗数值。

## 当前阶段建议

你处于筹备期时，优先完成 `design-pillars.md` + `mechanics-ledger.md`，再做一个可以跑 1 次完整测试局的 vertical slice。不要先生产大量职业、装备或怪物内容。
