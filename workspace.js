let selectedCategory = null;
const expandedTasks = new Set();

function makeButton(text, className, action) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = text;
  button.onclick = action;
  return button;
}

function beginDraft(host, initial, label, commit) {
  if (dirty || saving) return alert('먼저 작성 중인 내용을 저장하거나 취소하세요.');
  dirty = true;
  inlineDraft = true;
  $('editor').readOnly = true;
  host.replaceChildren();
  const box = document.createElement('textarea');
  box.className = 'inline-input';
  box.value = initial;
  box.placeholder = label;
  box.setAttribute('aria-label', label);
  const controls = document.createElement('div');
  controls.className = 'inline-controls';
  const submit = makeButton('저장', 'small-primary', async () => {
    if (!box.value.trim()) return alert('내용을 입력해 주세요.');
    box.disabled = true;
    submit.disabled = true;
    cancel.disabled = true;
    const ok = await commit(box.value);
    if (!ok) { box.disabled = false; submit.disabled = false; cancel.disabled = false; }
  });
  const cancel = makeButton('취소', 'small-quiet', () => { dirty = false; inlineDraft = false; $('editor').readOnly = false; render(); });
  controls.append(submit, cancel);
  host.append(box, controls);
  box.focus();
}

function renderWorkspace() {
  const root = $('categories');
  root.replaceChildren();
  const { lines, categories } = parseMemo(current.text, completedFirst);
  const intro = document.createElement('div');
  intro.className = 'workspace-heading';
  const title = document.createElement('div');
  const label = document.createElement('span');
  label.className = 'eyebrow';
  label.textContent = 'WORKSPACE';
  const heading = document.createElement('h2');
  heading.textContent = '업무 현황';
  title.append(label, heading);
  intro.append(title);
  if (editing) intro.append(makeButton('+ 카테고리 추가', 'secondary', () => {
    if (dirty || saving) return alert('먼저 작성 중인 내용을 저장하거나 취소하세요.');
    const name = prompt('새 카테고리 이름');
    if (!name?.trim()) return;
    if (/[\[\]\r\n]/.test(name)) return alert('카테고리 이름에 대괄호나 줄바꿈을 넣을 수 없습니다.');
    selectedCategory = categories.length;
    save(current.text.replace(/\s*$/, '') + '\n\n[' + name.trim() + ']\n');
  }));
  root.append(intro);
  if (!categories.length) {
    const empty = document.createElement('p');
    empty.className = 'workspace-empty';
    empty.textContent = '아직 카테고리가 없습니다.';
    root.append(empty);
    return;
  }
  if (selectedCategory === null || selectedCategory >= categories.length) selectedCategory = 0;
  const tabs = document.createElement('div');
  tabs.className = 'category-tabs';
  tabs.setAttribute('aria-label', '업무 카테고리');
  categories.forEach((category, index) => {
    const tab = makeButton('', 'category-tab' + (index === selectedCategory ? ' active' : ''), () => {
      if (dirty || saving) return alert('먼저 작성 중인 내용을 저장하거나 취소하세요.');
      selectedCategory = index;
      render();
    });
    tab.setAttribute('aria-pressed', String(index === selectedCategory));
    const name = document.createElement('span');
    name.className = 'category-name';
    name.textContent = category.title;
    const count = document.createElement('span');
    count.className = 'category-count';
    count.textContent = `${category.tasks.filter(task => task.done).length} / ${category.tasks.length}`;
    tab.append(name, count);
    tabs.append(tab);
  });
  root.append(tabs);
  const category = categories[selectedCategory];
  const panel = document.createElement('section');
  panel.className = 'workspace-panel';
  const panelHeader = document.createElement('div');
  panelHeader.className = 'panel-heading';
  const info = document.createElement('div');
  const panelTitle = document.createElement('h3');
  panelTitle.textContent = category.title;
  const subtitle = document.createElement('p');
  subtitle.textContent = `전체 ${category.tasks.length}개 · 완료 ${category.tasks.filter(task => task.done).length}개`;
  info.append(panelTitle, subtitle);
  panelHeader.append(info);
  if (editing) {
    const controls = document.createElement('div');
    controls.className = 'panel-controls';
    controls.append(makeButton('+ 업무 추가', 'secondary', () => {
      if (dirty || saving) return alert('먼저 작성 중인 내용을 저장하거나 취소하세요.');
      const content = prompt('추가할 업무를 입력하세요.');
      if (!content?.trim()) return;
      if (/[\r\n]/.test(content)) return alert('업무 제목은 한 줄로 입력하고 상세 내용은 과정 메모에 작성하세요.');
      const nums = lines.slice(category.index + 1, category.end).map(line => Number(line.match(/^\s*\*?(\d+)[.)]/)?.[1] || 0));
      const next = [...lines];
      next.splice(category.end, 0, `${Math.max(0, ...nums) + 1}. ${content.trim()}`);
      save(next.join('\n'));
    }));
    controls.append(makeButton('카테고리 삭제', 'small-quiet', () => {
      if (dirty || saving) return alert('먼저 작성 중인 내용을 저장하거나 취소하세요.');
      if (!category.tasks.length || category.tasks.some(task => !task.done)) return alert('모든 업무가 완료된 카테고리만 삭제할 수 있습니다.');
      if (!confirm('완료된 카테고리를 삭제할까요? 변경 이력은 유지됩니다.')) return;
      const next = [...lines];
      next.splice(category.index, category.end - category.index);
      selectedCategory = null;
      save(next.join('\n'));
    }));
    panelHeader.append(controls);
  }
  panel.append(panelHeader);
  for (const item of category.prefix.filter(item => item.text.trim())) {
    const note = document.createElement('p');
    note.className = 'category-note';
    note.textContent = item.text;
    panel.append(note);
  }
  const list = document.createElement('div');
  list.className = 'task-list';
  if (!category.tasks.length) {
    const empty = document.createElement('p');
    empty.className = 'workspace-empty';
    empty.textContent = '등록된 업무가 없습니다.';
    list.append(empty);
  }
  for (const task of category.tasks) {
    const details = document.createElement('details');
    details.className = 'task-detail';
    details.open = expandedTasks.has(task.index);
    details.ontoggle = () => { if (details.open) expandedTasks.add(task.index); else expandedTasks.delete(task.index); };
    const summary = document.createElement('summary');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.done;
    checkbox.disabled = !editing;
    checkbox.setAttribute('aria-label', '업무 완료');
    checkbox.onclick = event => event.stopPropagation();
    checkbox.onchange = () => {
      if (dirty || saving) { checkbox.checked = !checkbox.checked; return alert('먼저 작성 중인 내용을 저장하거나 취소하세요.'); }
      const next = [...lines];
      next[task.index] = checkbox.checked ? lines[task.index] + ' - V' : lines[task.index].replace(/\s*-?\s*V(?=\s|\(|$)/i, '');
      save(next.join('\n')).then(ok => { if (!ok) checkbox.checked = !checkbox.checked; });
    };
    const name = document.createElement('span');
    name.className = 'task-title' + (task.done ? ' done' : '');
    name.textContent = task.title.replace(/\s*-?\s*V(?=\s|\(|$)/i, '').replace(/\s+-\s*$/, '');
    const noteCount = document.createElement('span');
    noteCount.className = 'task-meta';
    const count = task.notes.filter(note => note.text.trim()).length;
    noteCount.textContent = count ? `메모 ${count}` : '상세 보기';
    const arrow = document.createElement('span');
    arrow.className = 'task-arrow';
    arrow.textContent = '›';
    summary.append(checkbox, name, noteCount, arrow);
    details.append(summary);
    const body = document.createElement('div');
    body.className = 'task-body';
    const bodyHead = document.createElement('div');
    bodyHead.className = 'task-body-head';
    const bodyTitle = document.createElement('strong');
    bodyTitle.textContent = '진행 과정';
    bodyHead.append(bodyTitle);
    if (editing) bodyHead.append(makeButton('업무명 수정', 'small-quiet', () => {
      if (dirty || saving) return alert('먼저 작성 중인 내용을 저장하거나 취소하세요.');
      const value = prompt('업무 내용을 수정하세요.', task.title);
      if (value === null || !value.trim()) return;
      if (/[\r\n]/.test(value)) return alert('업무 제목은 한 줄로 입력해 주세요.');
      const next = [...lines];
      next[task.index] = lines[task.index].replace(task.title, value.trim());
      save(next.join('\n'));
    }));
    body.append(bodyHead);
    const notes = task.notes.filter(note => note.text.trim());
    if (!notes.length) {
      const empty = document.createElement('p');
      empty.className = 'notes-empty';
      empty.textContent = '아직 작성된 과정 메모가 없습니다.';
      body.append(empty);
    }
    for (const note of notes) {
      const line = document.createElement('div');
      line.className = 'note-line';
      const content = document.createElement('span');
      content.textContent = note.text.replace(/^\s*>>\s?/, '');
      line.append(content);
      if (editing && /^\s*>>/.test(note.text)) line.append(makeButton('수정', 'note-edit', () => {
        beginDraft(line, note.text.replace(/^\s*>>\s?/, ''), '과정 메모 수정', async value => {
          const next = [...lines];
          next.splice(note.index, 1, ...value.replace(/\r\n?/g, '\n').split('\n').map(item => '>> ' + item));
          return save(next.join('\n'));
        });
      }));
      body.append(line);
    }
    if (editing) {
      const draft = document.createElement('div');
      draft.className = 'draft-area';
      draft.append(makeButton('+ 과정 메모 추가', 'add-note', () => beginDraft(draft, '', '진행 상황이나 상세 내용을 입력하세요', async value => {
        const next = insertNote(lines, task, value);
        return next === null ? false : save(next);
      })));
      body.append(draft);
    }
    details.append(body);
    list.append(details);
  }
  panel.append(list);
  root.append(panel);
}
