let completedTaskIds = JSON.parse(localStorage.getItem('completedTasks')) || [];
let scheduledTaskIds = JSON.parse(localStorage.getItem('scheduledTasks')) || [];
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

/**
 * FIXED REAL-TIME MATH: 
 * Calculates exact hours remaining based on the user's current local clock.
 */
function calculateHoursLeft(dueDateTimeStr) {
    try {
        // Standardizes Canvas string "Monday, Jan 5 at 11:59 PM" into a JS Date object
        const cleanDate = dueDateTimeStr.replace('at ', '');
        const dueDate = new Date(cleanDate + ", 2026");
        const now = new Date();
        
        const diffMs = dueDate - now;
        const diffHrs = diffMs / (1000 * 60 * 60);
        
        if (diffHrs < 0) return "0.0"; // Milestone has passed
        return diffHrs.toFixed(1);
    } catch (e) {
        return "--";
    }
}

function renderTasks() {
    const content = document.getElementById('content');
    const courseCards = document.getElementById('courseCards');
    content.innerHTML = '';
    courseCards.innerHTML = '';

    const now = new Date();

    Object.entries(courseData).forEach(([day, courses]) => {
        const daySection = document.createElement('div');
        daySection.className = 'day-section';
        daySection.innerHTML = `<div class="day-header">${day}</div>`;
        
        const dayContent = document.createElement('div');

        Object.entries(courses).forEach(([courseKey, categories]) => {
            const [courseName, dueInfo] = courseKey.split('|||');
            
            // PRE-CLASS GATE LOGIC: 
            // Only show courses whose upcoming class session has not yet passed.
            const cleanDateStr = dueInfo.replace('Due: ', '').replace('at ', '');
            const sessionTime = new Date(cleanDateStr + ", 2026");
            
            if (sessionTime < now) return; // Hides past sessions (Auto-Archive)

            // Create Course Section
            const section = document.createElement('div');
            section.className = 'course-section';
            section.innerHTML = `
                <div class="course-header">
                    <div class="course-title">${courseName}</div>
                    <div class="course-due">${dueInfo}</div>
                </div>`;
            
            const taskList = document.createElement('div');
            let tasksForThisSession = 0;
            let tasksCompleted = 0;
            let scheduledCount = 0;

            ['submit', 'reading', 'required', 'optional'].forEach(cat => {
                categories[cat].forEach((task, idx) => {
                    const taskId = getTaskKey(day, courseKey, cat, idx);
                    const isDone = completedTaskIds.includes(taskId);
                    const isScheduled = scheduledTaskIds.includes(taskId);
                    
                    tasksForThisSession++;
                    if (isDone) tasksCompleted++;
                    if (isScheduled) scheduledCount++;

                    const item = document.createElement('div');
                    item.className = `task-item ${isDone ? 'completed' : ''} ${isScheduled ? 'scheduled' : ''}`;
                    item.innerHTML = `
                        <input type="checkbox" class="task-checkbox" ${isDone ? 'checked' : ''} onclick="toggleTask('${taskId}')">
                        <div class="task-details">
                            <div class="task-title">${task.title}</div>
                            <div class="task-meta">
                                ⏱️ ${formatTime(task.time)} | 
                                <a href="${task.link}" target="_blank" class="task-link">🔗 Canvas</a>
                            </div>
                        </div>
                    `;
                    taskList.appendChild(item);
                });
            });

            section.appendChild(taskList);
            dayContent.appendChild(section);

            // RENDER "MISSION CONTROL" SUMMARY CARD
            const hoursLeft = calculateHoursLeft(dueInfo.replace('Due: ', ''));
            const unscheduledCount = tasksForThisSession - tasksCompleted - scheduledCount;
            
            const card = document.createElement('div');
            card.className = 'course-card';
            if (tasksCompleted === tasksForThisSession && tasksForThisSession > 0) card.classList.add('completed');
            
            card.innerHTML = `
                <div class="course-card-title">${courseName}</div>
                <div class="course-card-hours">${tasksCompleted === tasksForThisSession ? '✅' : hoursLeft}</div>
                <div class="course-card-hours-label">${tasksCompleted === tasksForThisSession ? 'COMPLETE' : 'HOURS LEFT'}</div>
                <div class="course-card-tasks">${tasksForThisSession - tasksCompleted}/${tasksForThisSession} tasks remaining</div>
                <div class="course-card-status">
                    ${scheduledCount > 0 ? `✓ ${scheduledCount} scheduled` : ''} 
                    ${unscheduledCount > 0 ? `⚠️ ${unscheduledCount} unscheduled` : ''}
                </div>
                <div class="course-card-due">📅 ${dueInfo}</div>
            `;
            courseCards.appendChild(card);
        });

        if (dayContent.children.length > 0) {
            daySection.appendChild(dayContent);
            content.appendChild(daySection);
        }
    });
}

function toggleTask(taskId) {
    const index = completedTaskIds.indexOf(taskId);
    if (index > -1) completedTaskIds.splice(index, 1);
    else completedTaskIds.push(taskId);
    localStorage.setItem('completedTasks', JSON.stringify(completedTaskIds));
    renderTasks();
}

function updateHomework() { window.location.reload(); }
window.onload = renderTasks;
