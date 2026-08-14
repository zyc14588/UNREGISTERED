#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""《未登记》UNREGISTERED 阶段1：潜入全流程蒙特卡洛模拟 v2
修正 v1 的三个模型缺陷：
1. 巡逻遭遇可选择"避让"（D3 规则），不再被迫交战
2. 加压策略分档：never / always / on_fail（只在失败时加压=合理策略）
3. 新增 ghost_route 主动无双路线模式（主动清剿全部守卫）
4. 新增 anomaly 模式（任务1 高压：每区 40% 概率目睹异常，全队压力+1）
"""
import random
from collections import Counter

def make_roller(rng):
    def r(skill, adv=0, dis=0, warn=False, mod=0):
        s = max(1, min(100, skill + mod))
        t1 = rng.randint(0, 9); t2 = rng.randint(0, 9)
        u = rng.randint(1, 10)
        t = t1
        if adv and not dis: t = min(t1, t2)
        elif dis and not adv: t = max(t1, t2)
        rr = t * 10 + u
        crit = s // 5
        if warn and rr >= 96: return 'fumble'
        if rr <= crit: return 'crit'
        if rr <= s: return 'success'
        if rr <= min(s + 15, 95): return 'cost'
        return 'fail'
    return r

class Agent:
    def __init__(self, stealth, takedown, observe, hack, pistol, evade, lockpick, talk):
        self.s = dict(stealth=stealth, takedown=takedown, observe=observe, hack=hack,
                      pistol=pistol, evade=evade, lockpick=lockpick, talk=talk)
        self.stress = 0
        self.crashed = False

def run_task(policy, anomaly=False, ghost_route=False, seed=0):
    rng = random.Random(seed)
    r = make_roller(rng)
    team = [
        Agent(60, 55, 55, 60, 50, 55, 60, 55),
        Agent(55, 50, 50, 65, 45, 50, 55, 60),
        Agent(50, 45, 60, 50, 55, 50, 50, 65),
        Agent(55, 55, 60, 50, 60, 55, 50, 50),
    ]
    best = lambda skill: max(a.s[skill] for a in team)

    exposures = 0; alert = 0; clock = 0; minutes = 0
    pushes = 0; guards = 6; fired = False; recon_bonus = 0
    anomaly_seen = 0

    def warn(): return any(a.stress >= 7 for a in team) or alert >= 2
    def gain_stress(n=1):
        for a in team: a.stress = min(10, a.stress + n)
    def crash_effects():
        for a in team:
            if a.stress >= 10: a.crashed = True
    def push_ok(): return any(a.stress < 7 for a in team)
    def push_reroll(skill, dis, mod):
        nonlocal pushes
        gain_stress(1); pushes += 1
        return r(best(skill), dis=dis, warn=warn(), mod=mod)

    def handle_res(res, skill, dis, mod, on_cost_extra=None):
        """统一处理五档后果；policy 控制加压。返回是否重掷后的新结果。"""
        nonlocal exposures, clock, alert
        if res == 'crit': return res
        if res == 'success': return res
        if res == 'cost':
            if policy == 'always' and push_ok():
                res2 = push_reroll(skill, dis, mod)
                if res2 in ('fail', 'fumble'):
                    exposures += 1; clock += 1; gain_stress(1)
                return res2
            exposures += 1
            if on_cost_extra: on_cost_extra()
            return res
        if res == 'fail':
            exposures += 1; clock += 1; gain_stress(1)
            if policy in ('always', 'on_fail') and push_ok():
                res2 = push_reroll(skill, dis, mod)
                if res2 in ('fail', 'fumble'):
                    exposures += 1; clock += 1; gain_stress(1)
                return res2
            return res
        # fumble
        exposures += 1; clock += 2; gain_stress(1); alert = min(3, alert + 1)
        return res

    # ---- 侦查 ----
    recon_ok = 0
    for skill in ['observe', 'hack', 'talk']:
        minutes += 30
        res = r(best(skill))
        if res in ('crit', 'success'): recon_ok += 1
        elif res == 'cost': exposures += 1
        elif res == 'fail': clock += 1
        else: clock += 1; exposures += 1
    if recon_ok >= 2: recon_bonus = 10

    # ---- 潜入 6 区域 ----
    for zone in range(6):
        minutes += 15
        clock += 1
        dis = 1 if any(a.crashed for a in team) else 0
        if anomaly and rng.random() < 0.4:
            gain_stress(1); anomaly_seen += 1
        res = r(best('stealth'), dis=dis, warn=warn(), mod=recon_bonus)
        handle_res(res, 'stealth', dis, recon_bonus)
        crash_effects()
        if ghost_route and guards > 0:
            # 无双路线：主动清剿（每区 1 名守卫）
            res = r(best('takedown'), dis=dis, warn=warn())
            if res in ('crit', 'success'):
                guards -= 1
            elif res == 'cost':
                guards -= 1; exposures += 1
            else:
                res2 = r(best('takedown'), mod=-20, warn=warn())
                if res2 in ('crit', 'success'):
                    guards -= 1
                elif res2 == 'cost':
                    guards -= 1; exposures += 1
                else:
                    fired = True; alert = min(3, alert + 1); gain_stress(1)
            crash_effects()
        if clock >= 4:
            clock = 0
            if ghost_route or rng.random() < 0.5:
                # 选择交战（ghost 路线=总是交战）
                res = r(best('takedown'), dis=dis, warn=warn())
                res = handle_res(res, 'takedown', dis, 0)
                if res in ('crit', 'success', 'cost'):
                    guards -= 1
                else:
                    # 缠斗：再试 -20，失败=开火
                    res2 = r(best('takedown'), mod=-20, warn=warn())
                    if res2 in ('crit', 'success', 'cost'):
                        guards -= 1
                        if res2 == 'cost': exposures += 1
                    else:
                        fired = True; alert = min(3, alert + 1); gain_stress(1)
            else:
                # 避让：隐匿检定
                res = r(best('stealth'), dis=dis, warn=warn())
                handle_res(res, 'stealth', dis, 0)
            crash_effects()
        if alert == 0 and exposures >= 2: alert = 1
        elif alert == 1 and exposures >= 5: alert = 2
        elif alert == 2 and exposures >= 8: alert = 3

    # ---- 开保险箱 ----
    minutes += 15
    res = r(best('lockpick'), warn=warn())
    res = handle_res(res, 'lockpick', 0, 0)
    got_target = res in ('crit', 'success', 'cost')
    if res == 'fail':
        minutes += 15
        res2 = r(best('lockpick'), warn=warn())
        got_target = res2 in ('crit', 'success', 'cost')
        if res2 == 'cost': exposures += 1

    # ---- 毁记录 ----
    rec_destroyed = False
    if got_target:
        res = r(best('hack'), warn=warn())
        if res in ('crit', 'success'): rec_destroyed = True
        elif res == 'cost': rec_destroyed = True; exposures += 1

    # ---- 撤离 ----
    mod = -20 if alert == 3 else (-10 if alert == 2 else 0)
    escaped = ghost_evade = False
    if alert == 0:
        escaped = True; ghost_evade = True
    else:
        dis = 1 if any(a.crashed for a in team) else 0
        res = r(best('evade'), dis=dis, warn=warn(), mod=mod)
        res = handle_res(res, 'evade', dis, mod)
        if res in ('crit', 'success', 'cost'):
            escaped = True; ghost_evade = (res == 'crit')
        else:
            minutes += 30
            res2 = r(best('evade'), dis=dis, warn=warn(), mod=mod)
            escaped = res2 in ('crit', 'success', 'cost')

    timeout = minutes > 480
    success = got_target and escaped and not timeout
    ghost = success and guards <= 0 and rec_destroyed and ghost_evade and not fired
    return dict(success=success, ghost=ghost, max_stress=max(a.stress for a in team),
                crashes=int(any(a.crashed for a in team)), alert=alert,
                exposures=exposures, minutes=minutes, pushes=pushes,
                fired=int(fired), got_target=got_target, escaped=escaped,
                anomaly_seen=anomaly_seen)

def simulate(policy, anomaly=False, ghost_route=False, n=20000, label=None):
    c = Counter(); pushes = 0; stress_sum = 0; alert_sum = 0; exp_sum = 0
    minutes_sum = 0; fired_n = 0; crash_n = 0; anom_sum = 0
    for i in range(n):
        o = run_task(policy, anomaly, ghost_route, seed=1000000 + i)
        key = ('ghost' if o['ghost'] else 'success' if o['success'] else
               'escape_no_target' if (o['escaped'] and not o['got_target']) else 'failed')
        c[key] += 1
        pushes += o['pushes']; stress_sum += o['max_stress']; alert_sum += o['alert']
        exp_sum += o['exposures']; minutes_sum += o['minutes']
        fired_n += o['fired']; crash_n += o['crashes']; anom_sum += o['anomaly_seen']
    print(f"=== {label or f'policy={policy} anomaly={anomaly} ghost={ghost_route}'} (N={n}) ===")
    for k in ['ghost', 'success', 'escape_no_target', 'failed']:
        print(f"  {k:<16}: {c[k]/n*100:5.1f}%")
    print(f"  任务成功率(含无双): {(c['ghost']+c['success'])/n*100:5.1f}%")
    print(f"  平均最高压力: {stress_sum/n:4.2f}  崩溃局占比: {crash_n/n*100:4.1f}%")
    print(f"  平均警报层级: {alert_sum/n:4.2f}  平均暴露: {exp_sum/n:5.2f}")
    print(f"  平均用时: {minutes_sum/n:5.1f} 分钟  开火局占比: {fired_n/n*100:4.1f}%")
    print(f"  平均加压次数: {pushes/n:4.2f}  平均目睹异常次数: {anom_sum/n:4.2f}")
    print()

if __name__ == '__main__':
    simulate('never', anomaly=False, label='教学关·从不加压')
    simulate('on_fail', anomaly=False, label='教学关·失败才加压（合理策略）')
    simulate('on_fail', anomaly=True, label='任务1高压·失败才加压')
    simulate('on_fail', anomaly=False, ghost_route=True, label='教学关·主动无双路线')
