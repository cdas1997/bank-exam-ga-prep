"""Build src/data/sbi-clerk-bank.json (SBI Clerk Mains 2026 GA: 400 questions in 8 sets of 50).

Inputs (scripts/raw/sbi/):
  *.json                researched batches: {"batches": [{"key", "name", "questions": [...]}]}
  verify/*.json         second-check verdicts: {"verdicts": [{"key", "q", "verdict": "ok|fix|drop", "note", "fix": {...}}]}
  final/*.json          final review of the chosen questions: {"verdicts": [{"id", "verdict", "fix": {...}}]}, keyed by
                        the bank id after the second-check fix; a dropped question is replaced by the next spare
  final-input/*.json    the questions as the final reviewers saw them (option order included), so an answer letter in
                        a final fix can be mapped back to its option text
  curation.json         optional {"drop": [ids], "keep": [ids]} for same-fact duplicates found by hand

Each paper set takes a fixed number of questions per topic (SET_MIX). Within a topic the most likely questions are
kept and dealt across the sets so every set gets the same share of high-chance questions.

usage: python3 scripts/build_sbi_bank.py            (add --report to list near-duplicate questions and exit)
"""
import hashlib
import json
import random
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

from build_bank import clean_question, norm, rebalance

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / 'scripts' / 'raw' / 'sbi'
OUT = ROOT / 'src' / 'data' / 'sbi-clerk-bank.json'
CHECKED = '19 November 2026'
EXAM_DATE = '2026-11-26'
SETS = 8
HOT = 4

# key: (name, group, questions per set)
TOPICS = {
    'ca-news': ('National & international news', 'current', 7),
    'ca-appointments': ('Appointments & resignations', 'current', 4),
    'ca-awards': ('Awards, honours & obituaries', 'current', 4),
    'ca-sports': ('Sports', 'current', 4),
    'ca-science': ('Science, defence & environment', 'current', 4),
    'ca-reports': ('Reports, indices & books', 'current', 4),
    'bf-rbi': ('RBI & monetary policy', 'banking', 4),
    'bf-banking': ('Banking operations & terms', 'banking', 3),
    'bf-digital': ('Digital banking & NPCI', 'banking', 3),
    'bf-regulators': ('Financial institutions & regulators', 'banking', 3),
    'bf-budget': ('Union Budget & government schemes', 'banking', 3),
    'sg-banking': ('Banking & financial static', 'static', 3),
    'sg-geography': ('Geography & culture', 'static', 2),
    'sg-general': ('Countries, important days & general facts', 'static', 2),
}
STOP = set('a an the of in on at to for from by with and or is are was were be been which who whom what when where how '
           'this that these those its it as into than then has have had will india indian 2026 2025 year month which '
           'following recently name named called'.split())
REFERS = re.compile(r'\b(all of the above|none of the above|both [a-d]\b|both \(?[a-d]\)? and|only [a-d]\b|neither)', re.I)


def qid(text):
    return hashlib.sha1(norm(text).encode()).hexdigest()[:10]


def tokens(text):
    return {t for t in norm(text).split() if t not in STOP and len(t) > 2}


def load_verdicts():
    """Maps a question id to its second-check verdict."""
    verdicts = {}
    for path in sorted((RAW / 'verify').glob('*.json')) if (RAW / 'verify').exists() else []:
        for v in json.loads(path.read_text()).get('verdicts', []):
            verdicts[qid(v['q'])] = v
    return verdicts


def load_final():
    """Maps a bank id to its final-review verdict, with any answer letter turned into the option text it named."""
    shown = {}
    for path in sorted((RAW / 'final-input').glob('*.json')) if (RAW / 'final-input').exists() else []:
        for q in json.loads(path.read_text())['questions']:
            shown[q['id']] = q['options']
    final = {}
    for path in sorted((RAW / 'final').glob('*.json')) if (RAW / 'final').exists() else []:
        for v in json.loads(path.read_text()).get('verdicts', []):
            fix = dict(v.get('fix') or {})
            if 'answer' in fix:
                options = fix.get('options') or shown.get(v['id'])
                letter = str(fix.pop('answer')).strip().upper()[:1]
                if not options or letter not in 'ABCD':
                    raise SystemExit(f'final review answer for {v["id"]} cannot be resolved')
                fix['answer_text'] = options['ABCD'.index(letter)]
            final[v['id']] = {**v, 'fix': fix}
    return final


def apply_fix(q, fix):
    """Applies a final-review fix; the answer is given as option text so option order never matters."""
    merged = {**q, **{k: v for k, v in fix.items() if k != 'answer_text'}}
    answer_text = fix.get('answer_text') or q['options']['ABCD'.index(q['answer'])]
    if norm(answer_text) not in [norm(o) for o in merged['options']]:
        raise SystemExit(f'final review fix for {q["id"]}: answer "{answer_text}" is not among the options')
    merged['answer'] = 'ABCD'[[norm(o) for o in merged['options']].index(norm(answer_text))]
    fixed = clean_question(merged)
    if not fixed:
        raise SystemExit(f'final review fix for {q["id"]} is not a valid question')
    return fixed


def load_questions():
    verdicts = load_verdicts()
    final = load_final()
    unmatched = set(verdicts)
    curation = json.loads((RAW / 'curation.json').read_text()) if (RAW / 'curation.json').exists() else {}
    dropped_by_hand = set(curation.get('drop', []))
    by_topic = defaultdict(list)
    stats = Counter()
    seen = set()
    for path in sorted(RAW.glob('*.json')):
        if path.name == 'curation.json':
            continue
        for batch in json.loads(path.read_text())['batches']:
            key = batch['key']
            if key not in TOPICS:
                raise SystemExit(f'{path.name}: unknown topic key {key!r}')
            for raw in batch['questions']:
                stats['read'] += 1
                original_id = qid(str(raw.get('q', '')))
                verdict = verdicts.get(original_id, {})
                unmatched.discard(original_id)
                if verdict.get('verdict') == 'drop':
                    stats['dropped by second check'] += 1
                    continue
                if verdict.get('verdict') == 'fix':
                    raw = {**raw, **verdict.get('fix', {})}
                    stats['fixed by second check'] += 1
                q = clean_question(raw)
                if not q or any(REFERS.search(o) for o in q['options']):
                    stats['invalid'] += 1
                    continue
                q['id'] = qid(q['q'])
                last = final.get(q['id'], {})
                if last.get('verdict') == 'drop':
                    stats['dropped by final review'] += 1
                    continue
                if last.get('verdict') == 'fix':
                    q.update(apply_fix(q, last.get('fix', {})))
                    stats['fixed by final review'] += 1
                q['reviewed'] = q['id'] in final
                if q['id'] in seen or q['id'] in dropped_by_hand or original_id in dropped_by_hand:
                    stats['duplicate or dropped by hand'] += 1
                    continue
                seen.add(q['id'])
                q['likely'] = max(1, min(5, int(raw.get('likely') or 3)))
                q['fact'] = str(raw.get('fact', ''))
                q['event_date'] = str(raw.get('event_date', ''))
                q['kind'] = str(raw.get('kind', ''))
                q['checked'] = verdict.get('verdict') in ('ok', 'fix')
                q['medium'] = raw.get('confidence') == 'medium'
                q['source'] = path.name
                by_topic[key].append(q)
    stats['verdicts that match no question'] = len(unmatched)
    stats['never second-checked'] = sum(1 for qs in by_topic.values() for q in qs if not q['checked'])
    return by_topic, stats


def near_duplicates(by_topic):
    """Pairs of questions that look like the same fact: same answer text and overlapping wording."""
    everything = [(k, q) for k, qs in by_topic.items() for q in qs]
    pairs = []
    for i, (ka, a) in enumerate(everything):
        ta = tokens(a['q'] + ' ' + a['fact'])
        ans_a = norm(a['options']['ABCD'.index(a['answer'])])
        for kb, b in everything[i + 1:]:
            tb = tokens(b['q'] + ' ' + b['fact'])
            overlap = len(ta & tb) / max(1, min(len(ta), len(tb)))
            same_answer = ans_a == norm(b['options']['ABCD'.index(b['answer'])])
            if overlap >= 0.75 or (same_answer and overlap >= 0.5):
                pairs.append((overlap, ka, a, kb, b))
    return sorted(pairs, key=lambda p: -p[0])


def pick(by_topic):
    """Keeps the most likely questions of each topic, up to its quota; second-checked ones win ties."""
    chosen, spare = {}, {}
    for key, (_, _, per_set) in TOPICS.items():
        ranked = sorted(by_topic.get(key, []), key=lambda q: (-q['likely'], not q['checked'], q['medium']))
        quota = per_set * SETS
        if len(ranked) < quota:
            raise SystemExit(f'{key}: only {len(ranked)} usable questions, {quota} needed')
        chosen[key], spare[key] = ranked[:quota], ranked[quota:]
    return chosen, spare


def deal(chosen, rng):
    """Deals each topic's questions, best first, across the sets; a different set gets the first card for each topic."""
    sets = [[] for _ in range(SETS)]
    for offset, (key, questions) in enumerate(chosen.items()):
        for i, q in enumerate(questions):
            sets[(i + offset * 3) % SETS].append(q)
    for paper in sets:
        rng.shuffle(paper)
    return sets


def main():
    by_topic, stats = load_questions()
    if '--report' in sys.argv:
        for overlap, ka, a, kb, b in near_duplicates(by_topic):
            print(f'{overlap:.2f}  [{ka}] {a["id"]} {a["q"][:110]}\n      [{kb}] {b["id"]} {b["q"][:110]}')
        print({k: len(v) for k, v in by_topic.items()}, dict(stats))
        return
    chosen, spare = pick(by_topic)
    originals = {q['id']: (list(q['options']), q['answer']) for qs in chosen.values() for q in qs}

    def shuffle_with(seed):
        rng = random.Random(seed)
        for questions in chosen.values():
            for q in questions:
                q['options'], q['answer'] = list(originals[q['id']][0]), originals[q['id']][1]
            rebalance(questions, rng)
        counts = Counter(q['answer'] for qs in chosen.values() for q in qs)
        return max(counts.values()) - min(counts.get(letter, 0) for letter in 'ABCD'), rng

    best = min(range(20261126, 20261126 + 300), key=lambda seed: shuffle_with(seed)[0])
    _, rng = shuffle_with(best)
    sets = deal(chosen, rng)
    keep = ('id', 'q', 'options', 'answer', 'explanation', 'likely')
    topics = [{'key': key, 'name': name, 'group': group, 'questions': [{f: q[f] for f in keep} for q in chosen[key]]}
              for key, (name, group, _) in TOPICS.items()]
    bank = {'checked': CHECKED, 'exam': EXAM_DATE, 'topics': topics, 'sets': [[q['id'] for q in paper] for paper in sets]}
    OUT.write_text(json.dumps(bank, ensure_ascii=False, indent=1) + '\n')

    everything = [q for qs in chosen.values() for q in qs]
    letters = Counter(q['answer'] for q in everything)
    months = Counter(q['event_date'][:7] if q['event_date'][:2] == '20' else 'static' for q in everything)
    print(f'{len(everything)} questions in {len(topics)} topics and {len(sets)} sets; {dict(stats)}')
    print(f'  high-chance {sum(q["likely"] >= HOT for q in everything)}; second-checked {sum(q["checked"] for q in everything)}; '
          f'medium-confidence {sum(q["medium"] for q in everything)}; answer letters {dict(sorted(letters.items()))}')
    print(f'  by date {dict(sorted(months.items()))}')
    print(f'  by kind {dict(Counter(q["kind"] for q in everything))}')
    print(f'  final-reviewed {sum(q["reviewed"] for q in everything)} of {len(everything)}; not yet: '
          f'{sorted({k for k, qs in chosen.items() for q in qs if not q["reviewed"]})}')
    for key, (name, _, per_set) in TOPICS.items():
        print(f'  {len(chosen[key]):3d} kept, {len(spare[key]):2d} spare  {name}  ({per_set} per set)')
    for n, paper in enumerate(sets, 1):
        mix = Counter(k for q in paper for k, qs in chosen.items() if q in qs)
        ok = all(mix[k] == per for k, (_, _, per) in TOPICS.items())
        print(f'  set {n}: {len(paper)} questions, high-chance {sum(q["likely"] >= HOT for q in paper)}, mix {"ok" if ok else "WRONG"}')


if __name__ == '__main__':
    main()
