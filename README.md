# 《未登记》UNREGISTERED

> **规则类无限流 × 全真模拟特工潜入** 的短战役 + 自制规则系统 + TRPG_PLATFORM 首发游戏包。
> 本仓库同时是 [OpenCode TRPG Sandbox Skill Pack v2.0.0](#9-技能包身份) 的源仓库与首个实战项目。

## 1. 项目是什么

| 项 | 内容 |
|---|---|
| Title | 《未登记》UNREGISTERED（旧代号《特工模拟》） |
| Rules | 自制规则（借成熟骨架深度改造，d100 核心由平台锁定）；Prototype 0 |
| Genre | 无限流为骨架 · 规则怪谈为副本血肉 · 特工"潜入-盗取-撤离"为玩法层 |
| Tone | 高压恐怖：冷峻特工流程为外壳，恐怖随潜入渗透，认知污染为主要威胁 |
| Scale | 短战役 5 次 × 5–6h（任务0–3 + 终局 2 场）＋ 2–4h 单次模组（任务0 教学/垂直切片） |
| Players | 3–4 名玩家 + 1 GM；混合熟练度 |
| 交付物 | TRPG_PLATFORM 游戏包 bundle（package_id: `zyc14588/agent-sim`） |
| 长线谜底 | ①管理方是谁 ②模拟为何存在 ③如何逃出——线索照埋，答案终局前锁定 |

一句话：**玩家是一群被管理方用不同把柄胁迫组队的特工，在"全真模拟"的任务里盗取目标物（物→情报→人→概念），而每一次结算都在提醒他们——被回收的可能不只是战利品。**

## 2. 当前进度看板

| 工作流 | 状态 | 关键产出 / 入口 |
|---|---|---|
| 战役总纲 | ✓ 66 项决策已确认 | `campaign/00-campaign.md` |
| 任务提案（0–终局） | ✓ 5 任务结构已 GM 决议 | `campaign/proposals/tasks-v1.md` |
| 世界观轮 | ○ 待开启 | 起始地区/世界内日期/管理员 NPC 命名、`campaign/state/world-state.yaml` 填充 |
| 规则核心 | ◐ 全 PROPOSAL | `rules/vertical-slice-v0.md` + `rules/mechanics-fine-v1.md` + `rules/logic-map-v1.md` |
| 静态审计 | ✓ 无 P0 | `campaign/validation/*.md` |
| 角色细化轮 | ✓ 决策 #62–#66 已确认 | `campaign/proposals/premades-v2.md`（六卡最终数值行/秘密分档/双向羁绊/触发器） |
| 阶段1 数学模拟 | ✓ 通过 | `playtest/sim-report-v1.md`（成功率 84–90%、无双 5.4%、崩溃高压局 5.7%△） |
| 阶段2 单人自测 | ✓ 复测通过 | `playtest/solo-report-v1.md`（首轮 9 卡点 → A/B/C 全修 → 复测清零） |
| 阶段3 桌测局 | ◐ 材料齐备，待真人执行 | `playtest/prototype-table-test-guide-v1.md` |
| 阶段4/5 校准与高压局 | ◐ 指引已备 | `playtest/stage4-5-guide-v1.md` |
| 平台游戏包 | ◐ 规划中 | `campaign/platform-package-plan.md`（剩 3 个决策点） |
| AIPT 规则模型 | ✓ P0-B002 MERGED_CLOSED | [40 Rules / 10 Invariants / 0 Mutations；机器规则与语义图均为 PROPOSAL](aipt/p0-b002/README.md) |
| Session 0 | ○ 未执行 | `campaign/session0-redlines.md` |

## 3. 下一步工作（优先级）

1. **阶段3 桌测执行**：材料全套齐备（全流程指南/运行指南/GM 速查/情报包/玩家道具/规则知识页/观察表/观察员小抄），等 3–4 名真人玩家开测。
2. **打印版预置卡速览页**：把 `premades-v2.md` §7 数值行＋秘密卡＋羁绊对做成可直接发卡的卡面材料。
3. **世界观轮**：定起始地区与世界内日期、命名据点管理员 NPC、填充 `world-state.yaml` 初始状态。
4. **剩余决策点收尾**：任务2「最新版伪造」确证时机；平台包 3 决策点（library 包拆分 / `host.random` fallback / 命令粒度）。
5. **长线谜底锁定**：终局前完成（决策 #49 有意保留悬念）。

## 4. 目录导览

```
campaign/
├── 00-campaign.md            # 战役总纲：66 项 GM 已确认决策（唯一裁决源）
├── proposals/                # 脑暴提案（PROPOSAL，确认后才转 canon）
│   ├── tasks-v1.md           #   任务0–终局 结构提案
│   ├── premades-v1.md        #   六预置卡底稿（已被 v2 细化替代）
│   ├── premades-v2.md        #   人物细化轮：秘密分档/双向羁绊/最终数值行/触发器
│   ├── skill-list-v2.md      #   35 技能清单与占位名映射
│   └── point-pools-v1.md     #   点数池 205/400 对比过程
├── rules/                    # 规则系统（生命周期: IDEA→PROPOSAL→PROTOTYPE→PLAYTEST→CANON→DEPRECATED）
│   ├── design-pillars.md     #   五支柱 + 复杂度预算 + Non-Goals
│   ├── vertical-slice-v0.md  #   核心判定/五素质/35技能/四轨/逆转窗口/潜入 procedure
│   ├── mechanics-fine-v1.md  #   参数细轮 A1–A8/B1–B6/C1–C2/D1–D8
│   ├── logic-map-v1.md       #   10 概念节点收敛校验
│   ├── probability-targets.md#   精确概率（枚举计算）
│   ├── mechanics-ledger.md   #   机制状态索引（唯一状态入口）
│   ├── playtest-plan-v1.md   #   阶段0–5 测试方案与材料索引
│   ├── playtest-log.md       #   测试记录入口（阶段1/阶段2 已录）
│   └── system-notes.md / terminology.md / rules-changelog.md
├── playtest/                 # 桌测材料与报告
│   ├── prototype-table-test-guide-v1.md  # 第一次原型桌测·全流程指南（总入口）
│   ├── stage3-run-guide-v1.md            # 局内运行指南（8 场景卡）
│   ├── gm-screen-v1.md · task0-intel-pack-v1.md · task0-handouts-v1.md
│   ├── rule-knowledge-sheet-v1.md · observation-sheet-v1.md · observer-cheatsheet-v1.md
│   ├── solo-kit-v1.md · solo-report-v1.md · sim-report-v1.md · stage4-5-guide-v1.md
│   └── scripts/sim_infiltration_v1.py    # 阶段1 蒙特卡洛脚本（可复跑回归）
├── validation/               # 静态审计（因果/规则/线索，均无 P0）
├── state/                    # world-state.yaml / timeline / thread-index（世界观轮后填充）
├── templates/ · sessions/    # 模板库与赛局记录约定
├── session0-redlines.md      # 安全红线与红灯清单
└── platform-notes.md · platform-package-plan.md   # 平台硬约束与包结构规划
knowledge/                    # 知识库（无限流/规则怪谈/案例/styles）
.opencode/skills/             # OpenCode TRPG Sandbox Skill Pack v2.0.0（25 个 skill）
```

## 5. 规则系统现状（Prototype 0）

- **核心判定**：d100 下掷五级结果，判定顺序固定（灾难优先：r≥96 且预警）→ 卓越/成功/带代价（+15，上限 95）/失败推进；修正值（±20）与状态减值分离；优劣势十位骰。
- **三层能力**：五素质（体能/敏捷/意志/智识/共情）＋ 35 项训练技能 ＋ 1 项专业特长（优势骰）。
- **四轨资源**：压力（≥7 预警，10 崩溃）／疲劳／伤口（轻-10/重-20+流血/致命=逆转窗口）／污染（0–10 永久，每点一条污染条，10=退场）。
- **潜入 procedure**：侦查（3 渠道×30min）→ 情报卡三层 → 计划（负载/路线/预案 2 点）→ 执行（巡逻时钟 4 段/警报 0–3/硬时限）→ 撤离 → 结算五段 → 据点休整（2 行动点，渗漏事件表 10%）。
- **角色**：六预置卡（游隼/短波/静水/底片/铁砧/缝线）+ 自建双轨；点数池素质 205／技能 400，高技能（≥55）≤3 项；成长横向为主（技能 +1d3 上限 65；异常学专项 +2 上限 80，≥70＝"看得太清楚"危险增强）。
- **状态纪律**：全部机制仍为 **PROPOSAL**；只有 GM 确认才转正。数值引用以 `mechanics-fine-v1.md` 为准，冲突项走 `logic-map-v1.md` 违例表。

## 6. 测试管线

| 阶段 | 内容 | 状态 |
|---|---|---|
| 0 | 静态基线（审计闭环、概率枚举精确、逻辑收敛） | ✓ 完成 |
| 1 | 数学模拟（N=20000×3+50000，成功率/无双率/加压价值/崩溃率/死亡螺旋） | ✓ 完成，报告 `playtest/sim-report-v1.md` |
| 2 | 单人纸面自测（GM 一人跑任务0 全流程） | ✓ 复测通过，报告 `playtest/solo-report-v1.md` §8 |
| 3 | 正式桌测局（3–4 玩家，任务0 教学局 2–4h，5 个主问题） | ◐ 待执行 |
| 4 | 校准轮（一次只改 1–3 个根因参数，记回归风险） | ◐ 指引已备 |
| 5 | 任务1《夜间交接》高压局（真怪谈＋污染首现） | ◐ 指引已备 |

测试纪律：**观察到的问题才修，一次少改，数值改动跑 `sim_infiltration_v1.py` 回归；未经确认的改动不进 CANON。**

## 7. 工作纪律（摘要，完整版见 `AGENTS.md`）

- 战役 canon 任务先读 `campaign/00-campaign.md` 和 `campaign/state/world-state.yaml`。
- 不替玩家角色决定行动/台词/感受/成长结论；设计 pressures / situations / actors / clocks / consequences，不设计预定章节。
- 所有 active situation、重要 NPC 目标、派系目标和地点压力都要有具体 **If Ignored**。
- 脑暴默认 PROPOSAL；只有已发生或 GM 明确确认才是 CANON；临场新事实记 provisional canon，赛后由 `campaign-state-keeper` 转正。
- GM-facing 内容要短、可扫描、可操作；player-facing read-aloud / handout 才使用文学性。
- 规则草案走生命周期；只有 CANON 或明确测试中的规则能进入对应内容；每次规则测试记录到 `rules/playtest-log.md`。
- 每次 session 后更新 recap、world state、timeline 和被触及实体的活动记录；玩家绕开准备内容时让世界继续变化，不强行重摆。

## 8. 安全工具

全套：X 卡 + Lines/Veils + Session 0 红灯清单（`campaign/session0-redlines.md`）。预设红线：儿童受害、精神疾病污名化、身体恐怖；自我认知攻击/现实解离为本作核心机制，列为 Session 0 必确认条目（强度 0/1/2 逐人确认）。认知污染的"错误信息"只作用于游戏内角色规则知识，绝不对玩家本人使用。

## 9. 技能包身份

本仓库同时是 **OpenCode TRPG Sandbox Skill Pack v2.0.0** 的源仓库（`pack-manifest.json` / `VALIDATION.md` 全部 PASS）：

- **A. 长战役/沙盒创作（14）**：campaign-director、state-keeper、world-engine、faction-simulator、npc-web、situation/encounter/location/quest-designer、mystery-clue-engine、improv-oracle、dialogue-voice、prose-writer、session-prep-recap。
- **B. 自制规则设计（10）**：trpg-system-designer、core-resolution、probability-balance-lab、character-progression、conflict-engine、resource-economy、gm-procedure、rules-content-forge、playtest-rules-auditor、rules-reference-writer。
- **C. 规则落地桥接（1）**：rules-system-adapter（把 CANON/明确测试中的规则映射到战役内容）。

安装：把 `.opencode/skills/` 复制到目标项目根目录。设计方法论与来源见 `SOURCES.md`、`TRPG-ADAPTATION.md`。数学工具：`python .opencode/skills/probability-balance-lab/scripts/dice_prob.py`（sum/pool/highest 三种模式，纯标准库）。
