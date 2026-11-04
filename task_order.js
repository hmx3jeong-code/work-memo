function taskOrder(lines, completedFirst) {
  if (!completedFirst) return lines.map((_, index) => index);
  const ordered = [];
  let index = 0;
  while (index < lines.length) {
    if (!/^\s*\[[^\]]+\]/.test(lines[index])) {
      ordered.push(index++);
      continue;
    }
    ordered.push(index++);
    const prefix = [], groups = [];
    while (index < lines.length && !/^\s*\[[^\]]+\]/.test(lines[index])) {
      const match = lines[index].match(/^\s*\*?\d+[.)]\s+(.+)/);
      if (match) groups.push({ done: /(?:^|\s|-)V(?:\s|\(|$)/i.test(match[1]), indices: [index] });
      else if (groups.length) groups[groups.length - 1].indices.push(index);
      else prefix.push(index);
      index++;
    }
    ordered.push(...prefix);
    for (const group of groups.filter(item => item.done)) ordered.push(...group.indices);
    for (const group of groups.filter(item => !item.done)) ordered.push(...group.indices);
  }
  return ordered;
}
if (typeof module !== 'undefined') module.exports = taskOrder;
