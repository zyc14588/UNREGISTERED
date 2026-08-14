# 阶段4/5 指引 v1（校准轮 + 任务1 高压局）

## 阶段4：校准轮流程（playtest-rules-auditor 纪律）

1. 从观察表提取 observed problem（只处理"观察到的问题"，不处理"感觉"）
2. 定位 suspected cause（根因机制，不是表象）
3. 最小改动（一次 1–3 个参数，禁止大修）
4. expected effect + regression risks（列回归清单）
5. next test（下次局验证什么）
6. 记录入口：`campaign/rules/playtest-log.md`（条目模板已备）；改动同步 `mechanics-ledger.md` 状态（PROPOSAL→PLAYTEST→CANON，未确认不转正）
7. 数值类改动：跑 `campaign/playtest/scripts/sim_infiltration_v1.py` 一键回归

## 阶段5：任务1《夜间交接》高压局主问题（5 个假设）

| Hypothesis | Observation | Pass Signal | Fail Signal |
|---|---|---|---|
| 预警条件触发频率适中 | 灾难档（96–00）出现次数 | 每局 0–3 次且每次有真实后果 | 0 次（无预警体验）或 >5 次（灾难廉价） |
| "被它记名=污染 1 格"闭环 | 排班表→污染条→GM 掺假→角色规则知识不可靠 全链 | 玩家自己发现"哪条信息变假了" | 污染条被遗忘或无法影响决策 |
| 硬时限构成真实时间压力 | 计划阶段的时间权衡是否发生 | 玩家为时间放弃侦查/选择快路线 | 时间被无视、8 小时从未逼近 |
| 矛盾双写=择信即择险 | 玩家争论"信哪份守则"的时长与后果 | 守则选择直接改变风险与路线 | 守则被当背景板略读 |
| 无双潜入可达 | 是否出现全灭+毁记录+完美脱追尝试 | 有人尝试且接近达成（模拟 5.4%） | 无人尝试或尝试者必失败 |

## 高压局附加安全要求

- Session 0 红灯清单照走（`campaign/session0-redlines.md`）；污染条用固定格式卡（"你的角色现在相信：___"）
- 灾难档出现时描述后果给选择，不直接宣布死亡；死亡走逆转窗口三层
