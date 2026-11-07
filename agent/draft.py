#!/usr/bin/env python3
"""Create ONE deterministic, review-required lesson proposal. No paid AI or network."""
import json, pathlib, datetime, sys
ROOT = pathlib.Path(__file__).resolve().parents[1]
CANDIDATES = json.loads((ROOT/'agent/candidates.json').read_text())
CATALOG = ROOT/'lessons/catalog.json'
def validate(lesson):
    assert isinstance(lesson.get('id'), str) and lesson['id']
    assert all(isinstance(lesson.get(k), str) and lesson[k] for k in ('title','arTitle','icon','blurb'))
    assert len(lesson.get('phrases', [])) >= 6
    ids = [p['id'] for p in lesson['phrases']]
    assert len(ids) == len(set(ids))
    for p in lesson['phrases']:
        assert all(isinstance(p.get(k),str) and p[k] for k in ('id','ar','tr','en'))
def main():
    data=json.loads(CATALOG.read_text())
    existing={x['id'] for x in data['lessons']}
    candidate=next((x for x in CANDIDATES if x['id'] not in existing),None)
    if candidate is None:
        print('No reviewed candidate available. No draft created.'); return 0
    validate(candidate)
    phrase_ids={p['id'] for x in data['lessons'] for p in x['phrases']}
    assert not ({p['id'] for p in candidate['phrases']} & phrase_ids)
    data['lessons'].append(candidate)
    data['version']=int(data.get('version',0))+1
    CATALOG.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
    print('DRAFT ONLY: '+candidate['id']+' '+candidate['title']+'; requires human language review and PR approval')
    return 0
if __name__=='__main__': sys.exit(main())
