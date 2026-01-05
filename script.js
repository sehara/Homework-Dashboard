let completedTaskIds = JSON.parse(localStorage.getItem('completedTasks')) || [];
let scheduledTaskIds = JSON.parse(localStorage.getItem('scheduledTasks')) || [];
let collapsedDays = JSON.parse(localStorage.getItem('collapsedDays')) || [];
let collapsedCourses = JSON.parse(localStorage.getItem('collapsedCourses')) || [];
let customTimeEstimates = JSON.parse(localStorage.getItem('customTimeEstimates')) || {};
let taskNotes = JSON.parse(localStorage.getItem('taskNotes')) || {};

function formatTime(hours) {
    const totalMinutes = Math.round(hours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
}

function getTaskKey(day, courseKey, category, itemIndex) {
    return `${day}|||${courseKey}|||${category}|||${itemIndex}`;
}

function toggleTask(taskId) {
    const index = completedTaskIds.indexOf(taskId);
    if (index > -1) completedTaskIds.splice(index, 1);
    else completedTaskIds.push(taskId);
    localStorage.setItem('completedTasks', JSON.stringify(completedTaskIds));
    renderTasks();
}

function toggleScheduled(taskId) {
    const index = scheduledTaskIds.indexOf(taskId);
    if (index > -1) scheduledTaskIds.splice(index, 1);
    else scheduledTaskIds.push(taskId);
    localStorage.setItem('scheduledTasks', JSON.stringify(scheduledTaskIds));
    renderTasks();
}

function saveNote(taskId, note) {
    if (!note.trim()) delete taskNotes[taskId];
    else taskNotes[taskId] = note;
    localStorage.setItem('taskNotes', JSON.stringify(taskNotes));
}

function renderCourseCards() {
    const courseCards = document.getElementById('courseCards');
    courseCards.innerHTML = '';
    const courseStats = {};
    
    Object.keys(courseData).forEach(day => {
        Object.keys(courseData[day]).forEach(courseKey => {
            const [courseName] = courseKey.split('|||');
            if (!courseStats[courseName]) courseStats[courseName] = { total: 0, remaining: 0, hours: 0, scheduled: 0, unscheduled: 0 };
            
            const info = courseData[day][courseKey];
            ['submit', 'reading', 'required', 'optional'].forEach(cat => {
                info[cat].forEach((item, idx) => {
                    const taskId = getTaskKey(day, courseKey, cat, idx);
                    courseStats[courseName].total++;
                    if (!completedTaskIds.includes(taskId)) {
                        courseStats[courseName].remaining++;
                        courseStats[courseName].hours += item.time;
                        if (scheduledTaskIds.includes(taskId)) courseStats[courseName].scheduled++;
                        else courseStats[courseName].unscheduled++;
                    }
                });
            });
        });
    });

    Object.entries(courseStats).forEach(([name, stats]) => {
        const card = document.createElement('div');
        card.className = 'course-card';
        if (stats.remaining === 0) card.classList.add('completed');
        
        card.innerHTML = `
            <div class="course-card-title">${name}</div>
            <div class="course-card-hours">${stats.remaining === 0 ? '✅' : stats.hours.toFixed(1)}</div>
            <div class="course-card-hours-label">${stats.remaining === 0 ? 'DONE' : 'HOURS LEFT'}</div>
            <div class="course-card-due">📅 ${courseInfo[name] ? courseInfo[name].due : ''}</div>
        `;
        courseCards.appendChild(card);
    });
}

function renderTasks() {
    const content = document.getElementById('content');
    content.innerHTML = '';

    Object.keys(courseData).forEach(day => {
        const daySection = document.createElement('div');
        daySection.className = 'day-section';
        daySection.innerHTML = `<div class="day-header">${day}</div>`;
        
        const dayContent = document.createElement('div');
        Object.keys(courseData[day]).forEach(courseKey => {
            const [name, due] = courseKey.split('|||');
            const section = document.createElement('div');
            section.className = 'course-section';
            section.innerHTML = `<div class="course-header"><div class="course-title">${name}</div><div class="course-due">${due}</div></div>`;
            
            const taskList = document.createElement('div');
            ['submit', 'reading'].forEach(cat => {
                courseData[day][courseKey][cat].forEach((task, idx) => {
                    const taskId = getTaskKey(day, courseKey, cat, idx);
                    const isDone = completedTaskIds.includes(taskId);
                    const item = document.createElement('div');
                    item.className = `task-item ${isDone ? 'completed' : ''}`;
                    item.innerHTML = `
                        <input type="checkbox" class="task-checkbox" ${isDone ? 'checked' : ''} onclick="toggleTask('${taskId}')">
                        <div class="task-details">
                            <div class="task-title">${task.title}</div>
                            <div class="task-meta">⏱️ ${formatTime(task.time)} | <a href="${task.link}" target="_blank">Canvas</a></div>
                        </div>
                    `;
                    taskList.appendChild(item);
                });
            });
            section.appendChild(taskList);
            dayContent.appendChild(section);
        });
        daySection.appendChild(dayContent);
        content.appendChild(daySection);
    });
    renderCourseCards();
}

function updateHomework() { window.location.reload(); }
window.onload = renderTasks;
