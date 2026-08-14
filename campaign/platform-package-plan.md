# 游戏包结构规划（PROPOSAL）

> 目标：把本作映射为 TRPG_PLATFORM 可安装的包结构（package_id: `zyc14588/agent-sim`）。
> 依据：`platform-notes.md`；SPEC-PACKAGE-001；SPEC-HOST-CALLBACK-001。本文件为规划提案，随平台 M0→V1 实际能力演进再转正。

## 1. 包拆分（bundle 分发）

| 包 | kind | 内容 | 状态 |
|---|---|---|---|
| `zyc14588/agent-sim` | game-system | 规则内核：状态 Schema、命令集、事件集、AI 契约、基础 UI、Lua 入口 | 规划中 |
| `zyc14588/agent-sim-campaign` | content | 短战役：任务0–3+终局的场景/角色/卡牌/地图配置/教程；单次模组（任务0 单独可启动） | 规划中 |
| `zyc14588/agent-sim-assets` | assets | 守则文本道具图、地图、结算文本、本地化、来源元数据 | 规划中 |
| `zyc14588/agent-sim-lib` | library（可选） | 共享 Lua 模块与 Schema（若多内容包复用） | 备选 |

依赖方向：campaign → system；assets 被 content 引用。bundle 锁定精确版本。

## 2. 六类子系统 → 类型化状态/命令/事件（初稿映射）

平台要求六类子系统共享类型化状态/命令/事件内核。初稿：

| 子系统 | 状态（state 示例） | 命令（command 示例） | 事件（event 示例） |
|---|---|---|---|
| 调查证据 | evidence{source,carrier,integrity,reliability,visibility,interpretation,chain_of_custody} | examine / share / compare / archive | evidence.gained / evidence.contaminated |
| 异常规则遵守 | rule_declaration{faction,text,version}；character_rule_knowledge{seen,inferred,verified,falsified,shared} | read_rule / test_rule / dispute_rule | rule.broken / rule.reconciled |
| 压力认知 | stress（0–10） | push / calm | stress.triggered（≥7 预警） |
| 生存资源 | loadout{items,weight}；fatigue；wounds{location,severity}；supplies | equip / drop / rest / patch | resource.depleted |
| 社会互动 | npc{goal,stance,evidence,relation,leverage,promise,debt} | persuade / interrogate / pose / promise | social.cost |
| 区域制战斗 | zone_map{links,los,cover,elevation,hazard,exit}；alert_level（0–3）；patrol_clocks | move / engage / takedown / shoot / extract | alert.raised / clock.advanced |

## 3. Lua 入口与 Host API（初稿）

- `on_session_create` / `on_session_start`：载入任务场景、初始状态、派单结算文本
- `validate_command` / `execute_command`：自然语言行动 → 结构化命令（如 `move-zone`、`use-skill`、`declare-plan`）；校验席位权限与动作空间
- `list_legal_actions`：供 AI/UI 展示合法动作（AI 席位视图）
- `project_view`：按席位输出视图（GM 视图/玩家视图/AI 主持视图：秘密不外泄）
- `on_session_end` / `cleanup`：结算、导出、审计

能力声明（M0 基线枚举）：必需 `host.state`；`host.random`（d100）按 V1 实际能力挂 optional+fallback（客户端骰面输入兜底）。

## 4. AI 主持契约（初稿，依据平台 §12）

- 分层计划：campaign → session → scene → NPC，计划≠事实
- **核心真相不可动态修改**：每任务的"客观异常法则"在内容包中锁定为只读
- 公开裁定格式：展示规则引用 + 公开输入 + 结果；不展示秘密/未触发计划/隐藏推理
- 席位视图：GM/AI 主持看真相层；玩家/AI 玩家只看到世界内文本与角色规则知识
- 世界内文本一律是游戏数据（防注入，平台强制）

## 5. 待 GM 决策点

1. 是否拆 library 包（取决于 content 包间复用度）
2. `host.random` 在 V1 未提供前的 fallback 方案（骰面输入/伪随机）
3. 命令粒度：泛化命令（use-skill）vs 特化命令（move-zone/takedown）的取舍（影响 AI 动作空间大小）
