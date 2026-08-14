---
name: rules-system-adapter
description: >-
  把系统无关的 TRPG 剧情、遭遇、危险、NPC、任务和旅行设计映射到项目当前正式或明确测试中的规则版本。优先读取本地规则状态，严格区分 CANON、HOUSE、PLAYTEST 与 PROPOSAL；自制系统筹备期只使用已确认机制，不擅自把规则设计提案当正式规则。触发词：数值、DC、属性、检定、stat block、难度、规则映射、mechanics、rules adapter。
compatibility: opencode
metadata:
  pack: "trpg-sandbox"
  layer: "mechanics-adapter"
---

# Rules System Adapter

这个 Skill 是**战役内容 ↔ 当前规则版本**之间的桥。它不是核心规则的主要发明者；需要设计新机制时先路由到 `trpg-system-designer`。

## 先读

1. `campaign/rules/system-notes.md`；
2. `campaign/rules/mechanics-ledger.md`；
3. ledger 中状态为 `CANON` 的规则文件；
4. 如果用户明确说“这次用测试规则”，再读取指定 `PROTOTYPE/PLAYTEST` 文件；
5. 已有 stat blocks / character sheets / encounter 格式。

## 规则状态

- `CANON`：可直接用于正式战役内容；
- `HOUSE`：战役明确采用，可使用并标记；
- `PROTOTYPE/PLAYTEST`：只有用户明确要求测试时才使用；
- `IDEA/PROPOSAL`：不能当正式规则。

## 缺少正式规则时

- 保持系统无关；
- 标记 `[RULES DESIGN NEEDED]` 或 `[PLAYTEST RULE NEEDED]`；
- 推荐加载 `trpg-system-designer`；
- 不默认套用 D&D 的 AC/HP/DC/CR/法术位等概念。

## 适配流程

1. 明确叙事目标与当前规则版本。
2. 找 CANON 中最接近的既有机制。
3. 使用项目已有数值尺度与术语。
4. 检查 PC 当前能力/资源（若资料存在）。
5. 输出桌上最小必要规则信息。
6. 标记任何测试机制或 GM 判断点。

## Encounter 适配

从 `encounter-situation-designer` 接收目标、敌对方、环境、压力与结束条件，再补充当前系统真正使用的：

- 威胁/难度表示；
- 关键 stat；
- 检定或行动；
- 伤害/资源代价；
- 失败与成功的规则后果；
- 逃跑/追逐/社交机制。

不要反过来为了已有 stat block 强迫遭遇变成“打到 0 HP”。

## Homebrew Request

如果用户要求**创造**规则：

`rules-system-adapter → trpg-system-designer → 对应专业规则 Skill → playtest-rules-auditor → 确认后再回到 rules-system-adapter`

规则未确认前不写入正式战役 canon。
