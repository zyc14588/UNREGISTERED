#!/usr/bin/env python3
"""Exact probability helper for common tabletop dice mechanics.

Examples:
  python dice_prob.py sum --dice 2 --sides 6 --bonus 1 --target 9
  python dice_prob.py pool --dice 5 --sides 6 --success-at 5 --required 2
  python dice_prob.py highest --dice 3 --sides 6 --partial-at 4 --full-at 6
"""
import argparse
import itertools
from collections import Counter


def pct(x):
    return f"{100*x:.2f}%"


def sum_mode(args):
    outcomes = Counter()
    total = args.sides ** args.dice
    for roll in itertools.product(range(1, args.sides + 1), repeat=args.dice):
        outcomes[sum(roll) + args.bonus] += 1
    success = sum(c for v, c in outcomes.items() if v >= args.target)
    mean = sum(v*c for v,c in outcomes.items()) / total
    print(f"mechanic: {args.dice}d{args.sides}{args.bonus:+d} >= {args.target}")
    print(f"success: {pct(success/total)} ({success}/{total})")
    print(f"expected total: {mean:.4f}")
    print("distribution:")
    for v in sorted(outcomes):
        print(f"  {v}: {pct(outcomes[v]/total)}")


def pool_mode(args):
    total = args.sides ** args.dice
    dist = Counter()
    for roll in itertools.product(range(1, args.sides + 1), repeat=args.dice):
        successes = sum(1 for d in roll if d >= args.success_at)
        dist[successes] += 1
    passed = sum(c for k,c in dist.items() if k >= args.required)
    expected = sum(k*c for k,c in dist.items())/total
    print(f"mechanic: {args.dice}d{args.sides}, success die >= {args.success_at}, need >= {args.required}")
    print(f"pass: {pct(passed/total)} ({passed}/{total})")
    print(f"expected successes: {expected:.4f}")
    print("success-count distribution:")
    for k in range(args.dice+1):
        if k in dist:
            print(f"  {k}: {pct(dist[k]/total)}")


def highest_mode(args):
    total = args.sides ** args.dice
    counts = Counter()
    for roll in itertools.product(range(1, args.sides + 1), repeat=args.dice):
        h=max(roll)
        if h >= args.full_at:
            counts['full'] += 1
        elif h >= args.partial_at:
            counts['partial'] += 1
        else:
            counts['fail'] += 1
    print(f"mechanic: highest of {args.dice}d{args.sides}; partial >= {args.partial_at}; full >= {args.full_at}")
    for key in ('fail','partial','full'):
        print(f"{key}: {pct(counts[key]/total)} ({counts[key]}/{total})")


def main():
    p=argparse.ArgumentParser(description="Exact probabilities for common TTRPG dice structures")
    sub=p.add_subparsers(dest='mode', required=True)

    s=sub.add_parser('sum', help='NdS + bonus >= target')
    s.add_argument('--dice', type=int, required=True)
    s.add_argument('--sides', type=int, required=True)
    s.add_argument('--bonus', type=int, default=0)
    s.add_argument('--target', type=int, required=True)
    s.set_defaults(func=sum_mode)

    q=sub.add_parser('pool', help='count dice meeting a per-die threshold')
    q.add_argument('--dice', type=int, required=True)
    q.add_argument('--sides', type=int, required=True)
    q.add_argument('--success-at', type=int, required=True)
    q.add_argument('--required', type=int, default=1)
    q.set_defaults(func=pool_mode)

    h=sub.add_parser('highest', help='take highest die and classify fail/partial/full')
    h.add_argument('--dice', type=int, required=True)
    h.add_argument('--sides', type=int, required=True)
    h.add_argument('--partial-at', type=int, required=True)
    h.add_argument('--full-at', type=int, required=True)
    h.set_defaults(func=highest_mode)

    args=p.parse_args()
    if args.dice < 1 or args.sides < 2:
        p.error('dice must be >=1 and sides >=2')
    if getattr(args, 'success_at', 1) > args.sides:
        p.error('success-at cannot exceed die sides')
    args.func(args)

if __name__ == '__main__':
    main()
