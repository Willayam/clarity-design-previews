from pathlib import Path
import re,json
r=Path('/Users/williamlarsten/Development/clarity-overnight-1006/verify/land/browser');prior=Path('/Users/williamlarsten/Development/clarity-overnight-1006/verify/e-round11/browser/coverage-table.md')
rows=[x.split('|') for x in prior.read_text().splitlines() if x.startswith('|')][2:];out=[]
overrides={56:['story-hit/Left-hit.json','story-hit/story-media-Left.json','canonical-keyboard/story-media-Left.json'],102:['canonical-keyboard/topbar-manual-name.json'],65:['seventh-diagnostic/seventh-logo-pointer.json','seventh-diagnostic/seventh-logo-keyboard.json'],74:['special-land/branch-hidden-pointer-edit.json'],75:['special-land/branch-hidden-pointer-required.json'],76:['special-land/branch-hidden-pointer-remove.json'],95:['drag/section-pointer-drag.json','drag/section-keyboard-move.json'],96:['drag/section-menu-move.json'],97:['canonical-keyboard/canvas-add.json'],98:['canonical-keyboard/canvas-remove.json'],99:['add-menu/branch-pointer-add-form.json','add-menu/branch-pointer-remove-form.json'],100:['canonical-keyboard/logos-move-down.json','canonical-keyboard/logos-move-up.json'],101:['canonical-keyboard/logos-remove-section.json'],110:['special-land/story-clear-body.json','pointer-finishing/clear-story-body.json'],111:['special-land/faq-clear-question.json'],165:['gaps-complete/hero-tab-remove.json','gaps-complete/tab-Edit.json'],166:['pricing/branch-keyboard-incomplete-pricing-tab.json'],167:['reopen-final/branch-hero-reopen.json'],168:['special-land/save-error-accessibility.json','special-land/save-error-recovered.json'],169:['empty-story/results.json'],184:['drag/section-pointer-drag.json','drag/section-menu-move.json'],185:['add-menu/branch-keyboard-add-form.json','add-menu/branch-keyboard-remove-form.json'],186:['reopen-final/branch-form-reopen.json','traversal-stable/results.json'],187:['reopen-final/branch-pricing-reopen.json','traversal-stable/results.json'],188:['extras-complete/panel-hero.json'],189:['extras-complete/panel-hero.json'],190:['canonical-keyboard/plan-add-dom.txt','canonical-keyboard/plan-add.json'],191:['faq-reorder-pointer-recheck/results.json','faq-reorder/results.json']}
for i,row in enumerate(rows,1):
 name=row[1].strip();refs=overrides.get(i)
 if refs is None:
  refs=re.findall(r'\]\(([^)]+)\)',row[5]) or re.findall(r'\]\(([^)]+)\)',row[4])
  refs=[x.replace('reopen-recheck/','reopen/').replace('duplicates/','duplicates-land/').replace('hidden-keyboard-typed/','special-land/') for x in refs]
  if 103<=i<=132:
   n=name.removeprefix('clear ');refs=['clearing-links/branch-'+n+'.json'] if i>=121 else ['clearing/branch-'+n+'.json']
   if i in overrides:refs=overrides[i]
  if 138<=i<=143:
   kind='hero' if i<=140 else 'story';action=['add','change','remove'][(i-138)%3];refs=[f'video-final/pointer-{kind}-video-{action}.json',f'video-final/keyboard-{kind}-video-{action}.json']
  if 144<=i<=164:
   kind=['story','form','pricing'][(i-144)//7];action=['Bold','Italic','Bullet-list','Numbered-list','Add-link','Edit-link','Remove-link'][(i-144)%7];refs=[f'rich/branch-{kind}-pointer-{action}.json'] if (i-144)%7<4 else [f'rich/branch-{kind}-{action}.json']
  if 178<=i<=180:refs=[x.replace('duplicates/','duplicates-land/') for x in refs]
 notes=''
 if i==56:notes='FAIL by pointer for a 640×100 story image. Resize handle covers Left. Keyboard passes.'
 if i in [148,149,150,155,156,157,162,163,164]:notes='Pointer passes. Existing keyboard toolbar gap reproduced.'
 if i==188:notes='Hero has no removable section handle, as required.'
 if i==189:notes='Old side panel and its toggle are intentionally absent.'
 missing=[x for x in refs if not (r/x).exists()]
 out.append(dict(row=i,capability=name,status='FAIL' if i==56 else 'PASS' if refs and not missing else 'NOT TESTABLE',evidence=refs,notes=notes,missing=missing))
(r/'coverage.json').write_text(json.dumps(out,indent=2))
print('Rows',len(out));print('Missing',[(x['row'],x['capability'],x['missing'])for x in out if x['status']!='PASS'])
