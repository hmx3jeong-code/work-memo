function parseMemo(text, completedFirst) {
  const lines = text.split('\n'), categories = [];
  for (let i = 0; i < lines.length; i++) {
    const heading = lines[i].match(/^\s*\[([^\]]+)\]/);
    if (heading) {
      if (categories.length) categories[categories.length - 1].end = i;
      categories.push({ title: heading[1], index: i, end: lines.length, tasks: [], prefix: [] });
      continue;
    }
    const category = categories[categories.length - 1];
    if (!category) continue;
    const match = lines[i].match(/^\s*\*?\d+[.)]\s+(.+)/);
    if (match) {
      const previous = category.tasks[category.tasks.length - 1];
      if (previous) previous.end = i;
      category.tasks.push({ index: i, end: category.end, title: match[1], done: /(?:^|\s|-)V(?:\s|\(|$)/i.test(match[1]), notes: [] });
    } else if (category.tasks.length) category.tasks[category.tasks.length - 1].notes.push({ index: i, text: lines[i] });
    else category.prefix.push({ index: i, text: lines[i] });
  }
  for (const category of categories) {
    if (category.tasks.length) category.tasks[category.tasks.length - 1].end = category.end;
    if (completedFirst) category.tasks.sort((a, b) => Number(b.done) - Number(a.done));
  }
  return { lines, categories };
}

function insertNote(lines, task, text) {
  const next = [...lines];
  const content = text.replace(/\r\n?/g, '\n').trim();
  if (!content) return null;
  next.splice(task.end, 0, ...content.split('\n').map(line => '>> ' + line));
  return next.join('\n');
}

if (typeof module !== 'undefined') module.exports = { parseMemo, insertNote };
