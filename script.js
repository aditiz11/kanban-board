let currentEditingTaskId = null;

function toggleForm() {
  const modal = document.getElementById('taskModal');
  modal.style.display = modal.style.display === 'block' ? 'none' : 'block';
}

function toggleEditForm() {
  const modal = document.getElementById('editModal');
  modal.style.display = modal.style.display === 'block' ? 'none' : 'block';
}

function toggleDarkMode() {
  document.body.classList.toggle('dark-mode');
  localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
}

window.onload = function () {
  loadTasks();

  if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark-mode');
  }

  const toggleBtn = document.createElement('button');
  toggleBtn.innerText = '🌗 Toggle Dark Mode';
  toggleBtn.style.position = 'fixed';
  toggleBtn.style.top = '10px';
  toggleBtn.style.right = '10px';
  toggleBtn.style.zIndex = 2000;
  toggleBtn.onclick = toggleDarkMode;
  document.body.appendChild(toggleBtn);

  ['todo', 'inprogress', 'done'].forEach(columnId => {
    const column = document.getElementById(columnId);
    
    // ⚙️ Sort Dropdown
    const dropdown = document.createElement('select');
    dropdown.style.position = 'absolute';
    dropdown.style.top = '6px';
    dropdown.style.right = '6px';
    dropdown.style.fontSize = '16px';
    dropdown.style.border = 'none';
    dropdown.style.background = 'transparent';
    dropdown.style.cursor = 'pointer';
    dropdown.style.zIndex = 10;

    dropdown.innerHTML = `
      <option disabled selected>🔽</option>
      <option value="name">Sort by Name</option>
      <option value="due">Sort by Due Date</option>
      <option value="priority">Sort by Priority</option>
    `;
    dropdown.onchange = function () {
      sortColumn(columnId, dropdown.value);
      dropdown.selectedIndex = 0;
    };
    column.style.position = 'relative';
    column.appendChild(dropdown);

    // 📂 Collapse Button
    const collapseBtn = document.createElement('button');
    collapseBtn.innerText = '📂';
    collapseBtn.title = 'Collapse/Expand';
    collapseBtn.style.position = 'absolute';
    collapseBtn.style.left = '6px';
    collapseBtn.style.top = '6px';
    collapseBtn.style.zIndex = 10;
    collapseBtn.style.border = 'none';
    collapseBtn.style.background = 'transparent';
    collapseBtn.style.cursor = 'pointer';
    collapseBtn.onclick = function () {
      const tasks = column.querySelectorAll('.task');
      tasks.forEach(task => {
        task.style.display = task.style.display === 'none' ? '' : 'none';
      });
    };
    column.appendChild(collapseBtn);
  });
};

function addTask() {
  const name = document.getElementById('taskName').value;
  const due = document.getElementById('dueDate').value;
  const priority = document.getElementById('priority').value;
  const column = document.getElementById('column').value;
  const tags = document.getElementById('taskTags').value;
  const description = document.getElementById('taskDescription').value;
  const subtasksText = document.getElementById('taskSubtasks').value;

  if (!name || !due) {
    alert('Please fill all fields');
    return;
  }

  const subtasks = subtasksText
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean)
    .map(title => ({ title, done: false }));

  const id = 'task-' + Date.now();
  const task = createTaskElement({ id, name, due, priority, column, tags, description, subtasks });

  document.getElementById(column).appendChild(task);
  saveTasks();

  toggleForm();
  document.getElementById('taskName').value = '';
  document.getElementById('dueDate').value = '';
  document.getElementById('priority').value = 'Low';
  document.getElementById('column').value = 'todo';
  document.getElementById('taskTags').value = '';
  document.getElementById('taskDescription').value = '';
  document.getElementById('taskSubtasks').value = '';
}

function createTagSpans(tags) {
  if (!tags) return '';
  return tags
    .split(',')
    .map(tag => `<span class="tag">${tag.trim()}</span>`)
    .join(' ');
}

function createSubtaskChecklist(subtasks, taskId) {
  if (!subtasks || subtasks.length === 0) return '';

  const completedCount = subtasks.filter(s => s.done).length;

  return `
    <p>Subtasks: ${completedCount} of ${subtasks.length} completed</p>
    <ul class="subtask-list">
      ${subtasks
        .map(
          (sub, index) => `
        <li>
          <label>
            <input type="checkbox" data-taskid="${taskId}" data-index="${index}" ${sub.done ? 'checked' : ''} onchange="toggleSubtaskDone(this)">
            ${sub.title}
          </label>
        </li>`
        )
        .join('')}
    </ul>`;
}

function createTaskElement({ id, name, due, priority, column, tags = '', description = '', subtasks = [] }) {
  const task = document.createElement('div');
  task.className = 'task';
  task.draggable = true;
  task.ondragstart = drag;
  task.id = id;

  const today = new Date().toISOString().split('T')[0];
  if (due < today && column !== 'done') {
    task.classList.add('overdue');
  }

  const priorityClass = `priority-label priority-${priority.toLowerCase()}`;
  const completedCount = subtasks.filter(s => s.done).length;
  const allDone = completedCount === subtasks.length && subtasks.length > 0;

  if (column === 'todo') task.classList.add('todo-highlight');
  else if (column === 'inprogress') task.classList.add('inprogress-highlight');
  else if (column === 'done') task.classList.add('done-highlight');

  if (allDone) {
    task.classList.add('maybe-done');
    task.classList.remove('todo-highlight', 'inprogress-highlight');
  }

  task.innerHTML = `
    <p><strong style="${column === 'done' ? 'text-decoration: line-through;' : ''}">${name}</strong></p>
    <p>Due: ${due}</p>
    <p><span class="${priorityClass}">${priority}</span></p>
    ${description ? `<p class="description">${description}</p>` : ''}
    <div class="tags">${createTagSpans(tags)}</div>
    ${createSubtaskChecklist(subtasks, id)}
    <button onclick="editTask('${id}')">Edit</button>
    <button onclick="removeTask('${id}')">Delete</button>
  `;

  task.dataset.subtasks = JSON.stringify(subtasks);
  task.dataset.description = description;
  return task;
}

function toggleSubtaskDone(checkbox) {
  const taskId = checkbox.dataset.taskid;
  const index = parseInt(checkbox.dataset.index);
  const taskEl = document.getElementById(taskId);
  const subtasks = JSON.parse(taskEl.dataset.subtasks);

  subtasks[index].done = checkbox.checked;
  taskEl.dataset.subtasks = JSON.stringify(subtasks);

  const updatedTask = createTaskElement({
    id: taskId,
    name: taskEl.querySelector('p strong').innerText,
    due: taskEl.children[1].innerText.replace('Due: ', ''),
    priority: taskEl.children[2].innerText.trim(),
    column: taskEl.parentElement.id,
    tags: [...taskEl.querySelectorAll('.tag')].map(t => t.innerText).join(', '),
    description: taskEl.dataset.description || '',
    subtasks: subtasks
  });

  taskEl.parentElement.replaceChild(updatedTask, taskEl);
  saveTasks();
}

function removeTask(id) {
  const task = document.getElementById(id);
  task.remove();
  saveTasks();
}

function editTask(id) {
  const task = document.getElementById(id);
  currentEditingTaskId = id;

  document.getElementById('editTaskName').value = task.querySelector('p strong').innerText;
  document.getElementById('editDueDate').value = task.children[1].innerText.replace('Due: ', '');
  document.getElementById('editPriority').value = task.children[2].innerText.trim();
  document.getElementById('editColumn').value = task.parentElement.id;

  const tagDiv = task.querySelector('.tags');
  const tags = [...tagDiv.querySelectorAll('.tag')].map(tag => tag.innerText).join(', ');
  document.getElementById('editTaskTags').value = tags;

  const subtasks = JSON.parse(task.dataset.subtasks || '[]');
  document.getElementById('editTaskSubtasks').value = subtasks.map(s => s.title).join('\n');

  document.getElementById('editTaskDescription').value = task.dataset.description || '';

  toggleEditForm();
}

function saveEditedTask() {
  const name = document.getElementById('editTaskName').value;
  const due = document.getElementById('editDueDate').value;
  const priority = document.getElementById('editPriority').value;
  const column = document.getElementById('editColumn').value;
  const tags = document.getElementById('editTaskTags').value;
  const description = document.getElementById('editTaskDescription').value;
  const subtasksText = document.getElementById('editTaskSubtasks').value;

  const subtasks = subtasksText
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean)
    .map(title => ({ title, done: false }));

  const task = document.getElementById(currentEditingTaskId);

  if (name && due && priority && column) {
    const updatedTask = createTaskElement({
      id: currentEditingTaskId,
      name,
      due,
      priority,
      column,
      tags,
      description,
      subtasks
    });

    task.parentElement.replaceChild(updatedTask, task);
    saveTasks();
  }

  toggleEditForm();
  currentEditingTaskId = null;
}

function allowDrop(ev) {
  ev.preventDefault();
}

function drag(ev) {
  ev.dataTransfer.setData('text', ev.target.id);
}

function drop(ev) {
  ev.preventDefault();
  const data = ev.dataTransfer.getData('text');
  const oldTask = document.getElementById(data);
  const columnId = ev.currentTarget.id;

  const name = oldTask.querySelector('p strong').innerText;
  const due = oldTask.children[1].innerText.replace('Due: ', '');
  const priority = oldTask.children[2].innerText.trim();
  const tags = [...oldTask.querySelectorAll('.tag')].map(t => t.innerText).join(', ');
  const description = oldTask.dataset.description || '';
  const subtasks = JSON.parse(oldTask.dataset.subtasks || '[]');

  const updatedTask = createTaskElement({
    id: data,
    name,
    due,
    priority,
    column: columnId,
    tags,
    description,
    subtasks
  });

  oldTask.remove();
  ev.currentTarget.appendChild(updatedTask);
  saveTasks();
}


function saveTasks() {
  const columns = ['todo', 'inprogress', 'done'];
  const tasks = [];

  columns.forEach(column => {
    const col = document.getElementById(column);
    const colTasks = col.getElementsByClassName('task');
    for (let task of colTasks) {
      const tags = [...task.querySelectorAll('.tag')].map(t => t.innerText).join(', ');
      const subtasks = JSON.parse(task.dataset.subtasks || '[]');

      tasks.push({
        id: task.id,
        name: task.querySelector('p strong').innerText,
        due: task.children[1].innerText.replace('Due: ', ''),
        priority: task.children[2].innerText.trim(),
        column: column,
        tags: tags,
        description: task.dataset.description || '',
        subtasks: subtasks
      });
    }
  });

  localStorage.setItem('kanbanTasks', JSON.stringify(tasks));
}

function loadTasks() {
  const data = localStorage.getItem('kanbanTasks');
  if (!data) return;

  const tasks = JSON.parse(data);
  tasks.forEach(task => {
    const taskElement = createTaskElement(task);
    const columnElement = document.getElementById(task.column);

    if (columnElement) {
      columnElement.appendChild(taskElement);
    } else {
      console.warn(`Invalid column "${task.column}". Removing task:`, task);
    }
  });
}

function sortColumn(columnId, criteria) {
  const column = document.getElementById(columnId);
  const tasks = Array.from(column.getElementsByClassName('task'));

  tasks.sort((a, b) => {
    const valA = getSortValue(a, criteria);
    const valB = getSortValue(b, criteria);
    return valA.localeCompare(valB, undefined, { numeric: true });
  });

  tasks.forEach(task => column.appendChild(task));
}

function getSortValue(task, criteria) {
  switch (criteria) {
    case 'name':
      return task.querySelector('p strong')?.innerText.toLowerCase() || '';
    case 'due':
      return task.children[1]?.innerText.replace('Due: ', '') || '';
    case 'priority':
      return task.children[2]?.innerText.trim().toLowerCase() || '';
    default:
      return '';
  }
}
