# 测试方案 v1（playtest-plan）

> 依据：`playtest-rules-auditor` 方法论 + `vertical-slice-v0.md` §12 校准项 + `mechanics-fine-v1.md` 节奏参数 + `playtest-log.md` 模板。
> 现状前提：TRPG_PLATFORM 处于 M0 无可玩功能 → 桌测以**线下/纸面**为主；平台化与 AI 主持契约测试属平台侧（V1 具备 Session 功能后另行安排）。

## 阶段 0：静态基线（已完成）

审计闭环（`validation/rules-audit-v1.md`、`causal-audit-v1.md`）、概率全部枚举精确（`probability-targets.md`）、逻辑收敛映射（`logic-map-v1.md`）。可直接进入实测。

## 阶段 1：数学模拟测试（无玩家，30–60 分钟）

- 目的：验证校准项与节奏参数的概率行为，找死亡螺旋/雪球/套利。
- 方法：Python 蒙特卡洛模拟典型潜入全流程（侦查→潜入→无声击倒→警报→撤离），统计：任务成功率分布、压力/污染分布、警报升级概率、加压使用收益、追逐脱追率。
- 验收：各频率落在 probability-targets 预期带内；无"一次失败→连锁失败"的死亡螺旋；资源有花有攒（无囤积无 spam）。

## 阶段 2：单人纸面自测（GM 独自，1–2 小时）

- 目的：检验 procedure 可执行性（潜入八要素流程、结算五段、休整 2 行动点）。
- 方法：GM 同时扮演 2 张预置卡跑任务0 全流程；记录卡点（哪里查表、哪里模棱两可、哪里忘了规则）。
- 验收：全流程按文档跑通；每次判定 5–10 秒内完成输入；无需现场发明规则。

## 阶段 3：正式桌测局（3–4 玩家 + GM，任务0 教学局 2–4h）

每次最多 3–5 个主问题，本局建议：

| Hypothesis | Observation to Capture | Pass Signal | Fail Signal |
|---|---|---|---|
| 擅长角色常规行动"十拿九稳" | 高技能检定结果记录 | 成功含代价 ≈75%（60 档） | 频繁失败推进打断计划 |
| 带代价+15 与加压被真实使用 | 代价/加压使用次数 | 每人每局 ≥1 次且非滥用 | 从不使用或每次都用 |
| 计划阶段是主要游戏内容 | 计划耗时与决策点记录 | 计划 ≥20 分钟且有路线取舍 | 计划被跳过/沦为过场 |
| 巡逻时钟/警报可感知可对抗 | 玩家规避/利用巡逻的次数 | 玩家主动利用班次空窗 | 玩家完全无视巡逻表 |
| 污染条 GM 负担可承受 | 掺假信息耗时 | 每条 ≤30 秒、不打断节奏 | 污染条被遗忘或搅乱全局 |

同时记录：动作时长、查表次数、资源消耗/恢复、未使用能力、玩家等待时间、漏洞/套利（auditor 观测清单）。

## 阶段 4：校准轮（每次只改 1–3 个根因）

按 auditor 改动纪律：observed problem → suspected cause → smallest change → expected effect → regression risks → next test。改动记入 `playtest-log.md` 并流转 mechanics-ledger 状态（PROPOSAL→PLAYTEST→CANON）。**禁止一次测试后大修**。

## 阶段 5：任务1 高压测试局（5–6h）

真怪谈（矛盾双写守则）+ 硬时限（23:00 交接班/06:00 天亮）+ 污染首现，验证：预警条件触发频率、灾难档体验、"被它记名=污染 1 格"闭环、无双潜入可行性。之后任务2/3/终局按同法逐局推进。

## 测试前准备清单（阶段 3 用）

- GM 速查表（五档判定/修正 vs 状态减值/四轨阈值/警报触发表/休整菜单，一页）
- 预置卡打印版（六选四）
- 任务0 场地情报卡（模拟版守则 1–2 份 + 巡逻表 + 楼层图）
- 观察表（playtest-log 模板打印）
- 骰子/骰子应用（d100 两枚十面骰 + 十位骰各一）

## 配套材料索引（已产出）

| 阶段 | 材料 | 文件 |
|---|---|---|
| 1 | 模拟脚本＋报告 | `campaign/playtest/scripts/sim_infiltration_v1.py` · `campaign/playtest/sim-report-v1.md` |
| 2 | 单人纸面自测包 | `campaign/playtest/solo-kit-v1.md` |
| 3 | 第一次原型桌测·全流程指南 | `campaign/playtest/prototype-table-test-guide-v1.md` |
| 3 | 开局/运行指南 | `campaign/playtest/stage3-run-guide-v1.md` |
| 3 | GM 速查表 | `campaign/playtest/gm-screen-v1.md` |
| 3 | 任务0 情报包（GM） | `campaign/playtest/task0-intel-pack-v1.md` |
| 3 | 任务0 玩家道具（守则文本） | `campaign/playtest/task0-handouts-v1.md` |
| 3 | 角色规则知识记录页 | `campaign/playtest/rule-knowledge-sheet-v1.md` |
| 3 | 观察表 | `campaign/playtest/observation-sheet-v1.md` |
| 3 | 观察员小抄 | `campaign/playtest/observer-cheatsheet-v1.md` |
| 4/5 | 校准轮＋高压局指引 | `campaign/playtest/stage4-5-guide-v1.md` |
| 全程 | 测试记录入口 | `campaign/rules/playtest-log.md` |
