/* テンプレートの配列 → 場面（インスタンス）の配列。vars の1つが場面1つ */
export function expand(file, list) {
  const out = [];
  for (const tpl of list) {
    for (const v of (tpl.vars && tpl.vars.length ? tpl.vars : [{}])) {
      out.push({
        id: tpl.id + (v.k ? ':' + v.k : ''), tpl, v, file,
        name: v.name ?? tpl.name, short: v.short ?? tpl.short ?? v.name ?? tpl.name,
        acts: v.acts ?? tpl.acts, modes: v.modes ?? tpl.modes ?? ['one', 'alt', 'both'], theme: v.theme ?? tpl.theme ?? 'home',
      });
    }
  }
  return out;
}
