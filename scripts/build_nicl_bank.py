"""Build src/data/nicl-bank.json (NICL Assistant Mains 2026: 120 GA + 80 Computer Knowledge questions).

Input: scripts/raw/nicl/questions.json, the questions of the claude.ai artifact "NICL Assistant Mains 2026",
imported as they are (no fact-check). Each question is {id, s: GA|CK, cat, q, o: [4 options], a: 0-3, e}.
Only the option order is shuffled (where no option refers to another), because the source keyed 116 of 200 answers as B.

usage: python3 scripts/build_nicl_bank.py
"""
import hashlib
import json
import random
from collections import Counter
from pathlib import Path

from build_bank import rebalance

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / 'scripts' / 'raw' / 'nicl' / 'questions.json'
OUT = ROOT / 'src' / 'data' / 'nicl-bank.json'
CHECKED = '23 October 2026'
LETTERS = 'ABCD'

# (section, category) -> topic key, topic name, group; in the order the topics are shown
TOPICS = [
    (('GA', 'Current Affairs'), 'nicl-current', 'Current affairs', 'current'),
    (('GA', 'Insurance'), 'nicl-insurance', 'Insurance awareness', 'banking'),
    (('GA', 'Banking'), 'nicl-banking', 'Banking & financial awareness', 'banking'),
    (('GA', 'Schemes'), 'nicl-schemes', 'Government schemes', 'banking'),
    (('GA', 'Static GK'), 'nicl-static', 'Static GK', 'static'),
    (('CK', 'Fundamentals'), 'nicl-ck-fundamentals', 'Computer fundamentals', 'computer'),
    (('CK', 'OS'), 'nicl-ck-os', 'Operating systems', 'computer'),
    (('CK', 'MS Office'), 'nicl-ck-office', 'MS Office', 'computer'),
    (('CK', 'Networking'), 'nicl-ck-networking', 'Networking & internet', 'computer'),
    (('CK', 'DBMS & Misc'), 'nicl-ck-dbms', 'DBMS & miscellaneous', 'computer'),
]


def main():
    raw = json.loads(RAW.read_text())
    by_cat = {}
    for item in raw['questions']:
        by_cat.setdefault((item['s'], item['cat']), []).append(item)
    unknown = set(by_cat) - {t[0] for t in TOPICS}
    if unknown:
        raise SystemExit(f'Categories without a topic: {sorted(unknown)}')
    rng = random.Random(20261030)
    topics = []
    for cat, key, name, group in TOPICS:
        questions = [{
            'id': 'nicl-' + hashlib.sha1(item['q'].strip().lower().encode()).hexdigest()[:10],
            'q': item['q'].strip(),
            'options': [o.strip() for o in item['o']],
            'answer': LETTERS[item['a']],
            'explanation': item['e'].strip(),
        } for item in sorted(by_cat.get(cat, []), key=lambda i: i['id'])]
        rebalance(questions, rng)
        topics.append({'key': key, 'name': name, 'group': group, 'questions': questions})
    ids = [q['id'] for t in topics for q in t['questions']]
    if len(ids) != len(set(ids)):
        raise SystemExit('Two NICL questions have the same text.')
    bank = {'checked': CHECKED, 'exam': raw['exam'], 'topics': topics}
    OUT.write_text(json.dumps(bank, ensure_ascii=False, indent=1) + '\n')
    letters = Counter(q['answer'] for t in topics for q in t['questions'])
    print(f'{len(ids)} questions in {len(topics)} topics; answer letters {dict(sorted(letters.items()))}')
    for t in topics:
        print(f"  {len(t['questions']):3d}  {t['name']}")


if __name__ == '__main__':
    main()
