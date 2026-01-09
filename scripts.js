// Archive management
const archivedCourses = JSON.parse(localStorage.getItem('archivedCourses') || '[]');
let showArchived = false;

function toggleArchive(courseName) {
    const index = archivedCourses.indexOf(courseName);
    if (index > -1) {
        archivedCourses.splice(index, 1); // Unarchive
    } else {
        archivedCourses.push(courseName); // Archive
    }
    localStorage.setItem('archivedCourses', JSON.stringify(archivedCourses));
    renderCourseCards(); // Re-render
}

function toggleShowArchived() {
    showArchived = !showArchived;
    renderCourseCards();
}

// State management
let completedTaskIds = JSON.parse(localStorage.getItem('completedTasks')) || [];
let scheduledTaskIds = JSON.parse(localStorage.getItem('scheduledTasks')) || [];
let collapsedDays = JSON.parse(localStorage.getItem('collapsedDays')) || [];
let collapsedCourses = JSON.parse(localStorage.getItem('collapsedCourses')) || [];
let customTimeEstimates = JSON.parse(localStorage.getItem('customTimeEstimates')) || {};
let taskNotes = JSON.parse(localStorage.getItem('taskNotes')) || {};

// Version check: Clear old 'prepare' data if detected (one-time only)
const TRACKER_VERSION = 'reading-v1';
const currentVersion = localStorage.getItem('trackerVersion');

if (!currentVersion || currentVersion !== TRACKER_VERSION) {
    // Check if old 'prepare' data exists
    let hasOldData = false;
    
    if (Array.isArray(completedTaskIds)) {
        hasOldData = completedTaskIds.some(id => typeof id === 'string' && id.includes('|||prepare|||'));
    }
    
    if (!hasOldData && Array.isArray(scheduledTaskIds)) {
        hasOldData = scheduledTaskIds.some(id => typeof id === 'string' && id.includes('|||prepare|||'));
    }
    
    if (hasOldData) {
        // Clear old data
        completedTaskIds = [];
        scheduledTaskIds = [];
        customTimeEstimates = {};
        taskNotes = {};
        
        localStorage.removeItem('completedTasks');
        localStorage.removeItem('scheduledTasks');
        localStorage.removeItem('customTimeEstimates');
        localStorage.removeItem('taskNotes');
        localStorage.removeItem('customTaskTitles');
        localStorage.removeItem('collapsedCategories');
        localStorage.removeItem('deletedCategories');
        localStorage.removeItem('categoryOrder');
        
        console.log('✅ Cleared old prepare data for reading compatibility');
    }
    
    // Set version flag
    localStorage.setItem('trackerVersion', TRACKER_VERSION);
}

let customTaskTitles = JSON.parse(localStorage.getItem('customTaskTitles')) || {};
let collapsedCategories = JSON.parse(localStorage.getItem('collapsedCategories')) || [];
let deletedCategories = JSON.parse(localStorage.getItem('deletedCategories')) || [];
let categoryOrder = JSON.parse(localStorage.getItem('categoryOrder')) || {};
let taskOrder = JSON.parse(localStorage.getItem('taskOrder')) || {};

// Utility functions
function formatTime(hours) {
    const totalMinutes = Math.round(hours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    
    if (h === 0) {
        return `${m} minutes`;
    } else if (m === 0) {
        return h === 1 ? '1 hour' : `${h} hours`;
    } else {
        const hourText = h === 1 ? '1 hour' : `${h} hours`;
        return `${hourText} ${m} minutes`;
    }
}

function getTaskTime(taskId, defaultTime) {
    return customTimeEstimates[taskId] || defaultTime;
}

function updateTaskTime(taskId, newTime) {
    customTimeEstimates[taskId] = newTime;
    localStorage.setItem('customTimeEstimates', JSON.stringify(customTimeEstimates));
    renderTasks();
}

function generateTimeOptions() {
    const options = [];
    for (let i = 0.5; i <= 8; i += 0.5) {
        options.push(i);
    }
    return options;
}

function createGoogleCalendarLink(title, description, duration, taskId) {
    const baseUrl = 'https://calendar.google.com/calendar/u/0/r/eventedit';
    const text = encodeURIComponent(title);
    let fullDescription = description;
    if (taskNotes[taskId]) {
        fullDescription += `\n\nNotes:\n${taskNotes[taskId]}`;
    }
    const details = encodeURIComponent(fullDescription);
    
    // Round to next 30-minute block
    const now = new Date();
    const minutes = now.getMinutes();
    const roundedMinutes = minutes < 30 ? 30 : 60;
    const startTime = new Date(now);
    startTime.setMinutes(roundedMinutes, 0, 0);
    if (roundedMinutes === 60) {
        startTime.setHours(startTime.getHours() + 1);
        startTime.setMinutes(0, 0, 0);
    }
    
    const durationMs = duration * 60 * 60 * 1000;
    const endTime = new Date(startTime.getTime() + durationMs);
    
    const formatDateTime = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = '00';
        return `${year}${month}${day}T${hours}${minutes}${seconds}`;
    };
    
    const dates = `${formatDateTime(startTime)}/${formatDateTime(endTime)}`;
    
    return `${baseUrl}?text=${text}&details=${details}&dates=${dates}`;
}

function saveTaskNote(taskId, note) {
    if (note.trim() === '') {
        delete taskNotes[taskId];
    } else {
        taskNotes[taskId] = note;
    }
    localStorage.setItem('taskNotes', JSON.stringify(taskNotes));
    renderTasks();
}

function formatDueDate(dateStr, courseName) {
    const date = new Date(dateStr);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const dayName = days[date.getDay()];
    const month = months[date.getMonth()];
    const day = date.getDate();
    
    // Get time from courseData by finding the matching course entry
    let timeStr = '';
    Object.keys(courseData).forEach(d => {
        Object.keys(courseData[d]).forEach(courseKey => {
            if (d === dateStr && courseKey.includes(courseName)) {
                const parts = courseKey.split('|||');
                if (parts[1]) {
                    // Extract just the time portion after "Due: "
                    const dueInfo = parts[1];
                    const timeMatch = dueInfo.match(/at (.+)/);
                    if (timeMatch) {
                        timeStr = 'at ' + timeMatch[1];
                    }
                }
            }
        });
    });
    
    return `${dayName}, ${month} ${day} ${timeStr}`;
}

function isTaskPastDue(dateStr, courseName) {
    const taskDate = new Date(dateStr);
    const now = new Date();
    const endTime = classEndTimes[courseName];
    if (!endTime) return false;
    
    const classEnd = new Date(taskDate);
    classEnd.setHours(endTime.hour, endTime.minute, 0, 0);
    
    return now > classEnd;
}

function isWithinSevenDays(dateStr) {
    const taskDate = new Date(dateStr);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const sevenDaysLater = new Date(now);
    sevenDaysLater.setDate(now.getDate() + 7);
    
    return taskDate >= now && taskDate <= sevenDaysLater;
}

function isWithinFourteenDays(dateStr) {
    const taskDate = new Date(dateStr);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const fourteenDaysLater = new Date(now);
    fourteenDaysLater.setDate(now.getDate() + 14);
    
    return taskDate >= now && taskDate <= fourteenDaysLater;
}

function filterAndOrganizeData() {
    const activeData = {};
    const archivedData = {};
    
    Object.keys(courseData).forEach(dateKey => {
        Object.keys(courseData[dateKey]).forEach(courseKey => {
            const [courseName] = courseKey.split('|||');
            const isPastDue = isTaskPastDue(dateKey, courseName);
            const isInWindow = isWithinFourteenDays(dateKey);
            
            if (isPastDue) {
                if (!archivedData[dateKey]) archivedData[dateKey] = {};
                archivedData[dateKey][courseKey] = courseData[dateKey][courseKey];
            } else if (isInWindow) {
                if (!activeData[dateKey]) activeData[dateKey] = {};
                activeData[dateKey][courseKey] = courseData[dateKey][courseKey];
            }
        });
    });
    
    return { active: activeData, archived: archivedData };
}

function getCategoryKey(day, courseKey, category) {
    return `${day}|||${courseKey}|||${category}`;
}

function getTaskKey(day, courseKey, category, itemIndex) {
    return `${day}|||${courseKey}|||${category}|||${itemIndex}`;
}

function isCategoryComplete(items, day, courseKey, category) {
    if (items.length === 0) return true;
    return items.every((item, itemIndex) => {
        const taskId = getTaskKey(day, courseKey, category, itemIndex);
        return completedTaskIds.includes(taskId);
    });
}

// Category and task management
function moveCategoryUp(day, courseKey, category) {
    const courseId = `${day}|||${courseKey}`;
    if (!categoryOrder[courseId]) {
        categoryOrder[courseId] = ['submit', 'reading', 'required', 'optional'];
    }
    const order = categoryOrder[courseId];
    const index = order.indexOf(category);
    if (index > 0) {
        [order[index], order[index - 1]] = [order[index - 1], order[index]];
        localStorage.setItem('categoryOrder', JSON.stringify(categoryOrder));
        renderTasks();
    }
}

function moveCategoryDown(day, courseKey, category) {
    const courseId = `${day}|||${courseKey}`;
    if (!categoryOrder[courseId]) {
        categoryOrder[courseId] = ['submit', 'reading', 'required', 'optional'];
    }
    const order = categoryOrder[courseId];
    const index = order.indexOf(category);
    if (index < order.length - 1) {
        [order[index], order[index + 1]] = [order[index + 1], order[index]];
        localStorage.setItem('categoryOrder', JSON.stringify(categoryOrder));
        renderTasks();
    }
}

function deleteCategory(day, courseKey, category) {
    const categoryKey = getCategoryKey(day, courseKey, category);
    if (!deletedCategories.includes(categoryKey)) {
        deletedCategories.push(categoryKey);
        localStorage.setItem('deletedCategories', JSON.stringify(deletedCategories));
        renderTasks();
    }
}

function restoreCategory(day, courseKey, category) {
    const categoryKey = getCategoryKey(day, courseKey, category);
    deletedCategories = deletedCategories.filter(c => c !== categoryKey);
    localStorage.setItem('deletedCategories', JSON.stringify(deletedCategories));
    renderTasks();
}

function moveTaskUp(day, courseKey, category, itemIndex) {
    const taskKey = `${day}|||${courseKey}|||${category}`;
    if (!taskOrder[taskKey]) {
        const items = courseData[day][courseKey][category];
        taskOrder[taskKey] = items.map((_, i) => i);
    }
    const order = taskOrder[taskKey];
    const index = order.indexOf(itemIndex);
    if (index > 0) {
        [order[index], order[index - 1]] = [order[index - 1], order[index]];
        localStorage.setItem('taskOrder', JSON.stringify(taskOrder));
        renderTasks();
    }
}

function moveTaskDown(day, courseKey, category, itemIndex) {
    const taskKey = `${day}|||${courseKey}|||${category}`;
    if (!taskOrder[taskKey]) {
        const items = courseData[day][courseKey][category];
        taskOrder[taskKey] = items.map((_, i) => i);
    }
    const order = taskOrder[taskKey];
    const index = order.indexOf(itemIndex);
    if (index < order.length - 1) {
        [order[index], order[index + 1]] = [order[index + 1], order[index]];
        localStorage.setItem('taskOrder', JSON.stringify(taskOrder));
        renderTasks();
    }
}

function toggleTask(taskId) {
    const index = completedTaskIds.indexOf(taskId);
    if (index > -1) {
        completedTaskIds.splice(index, 1);
    } else {
        completedTaskIds.push(taskId);
    }
    localStorage.setItem('completedTasks', JSON.stringify(completedTaskIds));
    renderTasks();
    renderCourseCards();
}

function toggleScheduled(taskId) {
    const index = scheduledTaskIds.indexOf(taskId);
    if (index > -1) {
        scheduledTaskIds.splice(index, 1);
    } else {
        scheduledTaskIds.push(taskId);
    }
    localStorage.setItem('scheduledTasks', JSON.stringify(scheduledTaskIds));
    renderTasks();
    renderCourseCards();
}

function toggleDay(day) {
    const index = collapsedDays.indexOf(day);
    if (index > -1) {
        collapsedDays.splice(index, 1);
    } else {
        collapsedDays.push(day);
    }
    localStorage.setItem('collapsedDays', JSON.stringify(collapsedDays));
    renderTasks();
}

function toggleCourse(courseKey) {
    const index = collapsedCourses.indexOf(courseKey);
    if (index > -1) {
        collapsedCourses.splice(index, 1);
    } else {
        collapsedCourses.push(courseKey);
    }
    localStorage.setItem('collapsedCourses', JSON.stringify(collapsedCourses));
    renderTasks();
}

function toggleCategory(categoryKey) {
    const index = collapsedCategories.indexOf(categoryKey);
    if (index > -1) {
        collapsedCategories.splice(index, 1);
    } else {
        collapsedCategories.push(categoryKey);
    }
    localStorage.setItem('collapsedCategories', JSON.stringify(collapsedCategories));
    renderTasks();
}

function renderCourseCards() {
    const container = document.getElementById('courseCards');
    container.innerHTML = ''; // Clear existing cards

    const courseStats = {};
    
    // NEW: Build map of NEXT (future) class date for each course
    const nextClassDates = {};
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    // First pass: find the earliest FUTURE class for each course
    Object.keys(courseData).forEach(day => {
        Object.keys(courseData[day]).forEach(courseKey => {
            const [courseName, dueInfo] = courseKey.split('|||');
            
            // Parse the actual due date/time from the course key
            const taskDate = new Date(day);
            
            // Extract time from "Due: Tuesday, Jan 6 at 8:30 AM"
            const timeMatch = dueInfo.match(/at (\d+):(\d+) (AM|PM)/);
            if (timeMatch) {
                let hours = parseInt(timeMatch[1]);
                const minutes = parseInt(timeMatch[2]);
                const period = timeMatch[3];
                
                if (period === 'PM' && hours !== 12) hours += 12;
                if (period === 'AM' && hours === 12) hours = 0;
                
                taskDate.setHours(hours, minutes, 0, 0);
            }
            
            // Skip if this class time has already passed
            const now = new Date();
            if (taskDate < now) return;
            
            // Store the first future class for this course
            if (!nextClassDates[courseName]) {
                nextClassDates[courseName] = day;
            }
        });
    });

    // Second pass: count tasks ONLY for the next class date
    Object.keys(courseData).forEach(day => {
        Object.keys(courseData[day]).forEach(courseKey => {
            const [courseName] = courseKey.split('|||');
            
            // NEW: Only count if this is the NEXT class date
            if (day !== nextClassDates[courseName]) return;
            
            if (!courseStats[courseName]) {
                courseStats[courseName] = { 
                    total: 0, 
                    remaining: 0, 
                    totalHours: 0, 
                    remainingHours: 0,
                    scheduled: 0,
                    unscheduled: 0
                };
            }
            
            const courseInfo = courseData[day][courseKey];
            ['submit', 'reading', 'required', 'optional'].forEach(category => {
                courseInfo[category].forEach((item, itemIndex) => {
                    const taskId = getTaskKey(day, courseKey, category, itemIndex);
                    const taskTime = getTaskTime(taskId, item.time);
                    courseStats[courseName].total++;
                    courseStats[courseName].totalHours += taskTime;
                    if (!completedTaskIds.includes(taskId)) {
                        courseStats[courseName].remaining++;
                        courseStats[courseName].remainingHours += taskTime;
                        if (scheduledTaskIds.includes(taskId)) {
                            courseStats[courseName].scheduled++;
                        } else {
                            courseStats[courseName].unscheduled++;
                        }
                    }
                });
            });
        });
    });

    Object.keys(courseStats).forEach(courseName => {
        const stats = courseStats[courseName];
        const isComplete = stats.remaining === 0;
        const isArchived = archivedCourses.includes(courseName);
        const archiveClass = isArchived ? 'archived' : '';

        // Skip archived courses if not showing archived
        if (isArchived && !showArchived) {
            return; // Skip this course
        }

        const card = document.createElement('div');
        card.className = `course-card ${isComplete ? 'completed' : ''} ${archiveClass}`;
        
        if (!isComplete) {
            if (stats.remainingHours <= 2) {
                card.classList.add('low-workload');
            } else if (stats.remainingHours <= 5) {
                card.classList.add('medium-workload');
            } else {
                card.classList.add('high-workload');
            }
        }

        if (isComplete) {
            card.innerHTML = `
                <div class="course-card-title">${courseName}</div>
                <div class="course-card-hours">✅</div>
                <div class="course-card-hours-label">COMPLETE</div>
                <div class="course-card-tasks">${stats.total} tasks done</div>
                <button class="archive-btn" onclick="toggleArchive('${courseName}')">
                    ${isArchived ? '↩️ Unarchive' : '📦 Archive'}
                </button>
                <div class="course-card-due">📅 ${nextClassDates[courseName] ? formatDueDate(nextClassDates[courseName], courseName) : 'No upcoming class'}</div>
            `;
        } else {
            let statusHTML = '';
            if (stats.unscheduled === 0) {
                statusHTML = `<div class="course-card-status under-control">✓ ${stats.scheduled} scheduled</div>`;
            } else if (stats.scheduled === 0) {
                statusHTML = `<div class="course-card-status needs-scheduling">⚠️ ${stats.unscheduled} unscheduled</div>`;
            } else {
                statusHTML = `<div class="course-card-status partial">✓ ${stats.scheduled} scheduled | ⚠️ ${stats.unscheduled} unscheduled</div>`;
            }
            
            card.innerHTML = `
                <div class="course-card-title">${courseName}</div>
                <div class="course-card-hours">${stats.remainingHours.toFixed(1)}</div>
                <div class="course-card-hours-label">HOURS LEFT</div>
                <div class="course-card-tasks">${stats.remaining}/${stats.total} tasks remaining</div>
                ${statusHTML}
                <div class="course-card-due">📅 ${nextClassDates[courseName] ? formatDueDate(nextClassDates[courseName], courseName) : 'No upcoming class'}</div>
            `;
        }

        container.appendChild(card);
    });

    // Add show archived toggle
    const toggleHtml = `
        <div class="show-archived-toggle">
            <input type="checkbox" id="showArchivedCheckbox" ${showArchived ? 'checked' : ''} onchange="toggleShowArchived()">
            <label for="showArchivedCheckbox">Show Archived Courses (${archivedCourses.length})</label>
        </div>
    `;

    // Insert toggle after the "Remaining Work This Week" header
    const header = document.querySelector('.summary-title');
    if (header && archivedCourses.length > 0) {
        header.insertAdjacentHTML('afterend', toggleHtml);
    }
}

function renderTasks() {
    const content = document.getElementById('content');
    content.innerHTML = '';

    const { active, archived } = filterAndOrganizeData();

    // Render active tasks
    Object.keys(active).forEach(day => {
        const daySection = document.createElement('div');
        daySection.className = 'day-section';
        
        const isCollapsed = collapsedDays.includes(day);
        
        daySection.innerHTML = `
            <div class="day-header ${isCollapsed ? 'collapsed' : ''}" onclick="toggleDay('${day}')">
                <span>${new Date(day).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                <span class="arrow">▼</span>
            </div>
            <div class="day-content ${isCollapsed ? 'collapsed' : ''}"></div>
        `;
        
        const dayContent = daySection.querySelector('.day-content');
        
        Object.keys(active[day]).forEach(courseKey => {
            const [courseName] = courseKey.split('|||');
            const courseSection = document.createElement('div');
            courseSection.className = 'course-section';
            
            const isCourseCollapsed = collapsedCourses.includes(`${day}|||${courseKey}`);
            
            courseSection.innerHTML = `
                <div class="course-header ${isCourseCollapsed ? 'collapsed' : ''}" onclick="toggleCourse('${day}|||${courseKey}')">
                    <div class="course-title">
                        ${courseName}
                        ${courseInfo[courseName].syllabusUrl ? `<a href="${courseInfo[courseName].syllabusUrl}" class="course-syllabus-link" target="_blank" onclick="event.stopPropagation()">📄</a>` : ''}
                    </div>
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div class="course-due">${formatDueDate(day, courseName)}</div>
                        <span class="course-arrow">▼</span>
                    </div>
                </div>
                <div class="course-content ${isCourseCollapsed ? 'collapsed' : ''}"></div>
            `;
            
            const courseContent = courseSection.querySelector('.course-content');
            const courseId = `${day}|||${courseKey}`;
            
            // Use custom order if exists
            const categories = categoryOrder[courseId] || ['submit', 'reading', 'required', 'optional'];
            
            categories.forEach(category => {
                const items = active[day][courseKey][category];
                if (items.length === 0) return;
                
                const categoryKey = getCategoryKey(day, courseKey, category);
                if (deletedCategories.includes(categoryKey)) return;
                
                const categorySection = document.createElement('div');
                categorySection.className = 'task-category';
                
                const isCatCollapsed = collapsedCategories.includes(categoryKey);
                const isComplete = isCategoryComplete(items, day, courseKey, category);
                
                categorySection.innerHTML = `
                    <div class="category-title ${isCatCollapsed ? 'collapsed' : ''} ${isComplete ? 'grayed-out' : ''}" onclick="toggleCategory('${categoryKey}')">
                        <div class="category-title-left">
                            <span class="category-arrow">▼</span>
                            <span>${category.toUpperCase()}</span>
                            ${category === 'submit' && courseInfo[courseName].assignmentsUrl ? `<a href="${courseInfo[courseName].assignmentsUrl}" class="category-assignments-link" target="_blank" onclick="event.stopPropagation()">🔗</a>` : ''}
                        </div>
                        <div class="category-title-right">
                            ${isComplete ? '<span class="category-status">✓ Done</span>' : ''}
                            <div class="category-controls" onclick="event.stopPropagation()">
                                <button class="category-btn" onclick="moveCategoryUp('${day}', '${courseKey}', '${category}')">▲</button>
                                <button class="category-btn" onclick="moveCategoryDown('${day}', '${courseKey}', '${category}')">▼</button>
                                <button class="category-btn delete-btn" onclick="deleteCategory('${day}', '${courseKey}', '${category}')">✕</button>
                            </div>
                        </div>
                    </div>
                    <div class="category-content ${isCatCollapsed ? 'collapsed' : ''}"></div>
                `;
                
                const categoryContent = categorySection.querySelector('.category-content');
                
                // Use custom task order if exists
                const taskKey = `${day}|||${courseKey}|||${category}`;
                const order = taskOrder[taskKey] || items.map((_, i) => i);
                
                order.forEach(itemIndex => {
                    const item = items[itemIndex];
                    const taskId = getTaskKey(day, courseKey, category, itemIndex);
                    const isTaskComplete = completedTaskIds.includes(taskId);
                    const isScheduled = scheduledTaskIds.includes(taskId);
                    const taskTime = getTaskTime(taskId, item.time);
                    
                    const taskItem = document.createElement('div');
                    taskItem.className = `task-item ${isTaskComplete ? 'completed' : ''}`;
                    
                    taskItem.innerHTML = `
                        <input type="checkbox" class="task-checkbox" ${isTaskComplete ? 'checked' : ''} onchange="toggleTask('${taskId}')">
                        <div class="task-details">
                            <a href="${item.link || '#'}" class="task-title" target="_blank">${item.title}</a>
                            <div class="task-meta">
                                ${item.points ? `<span class="task-points">${item.points} pts</span>` : ''}
                                <div class="task-time">
                                    <span>⏱️</span>
                                    <select class="time-select" onchange="updateTaskTime('${taskId}', parseFloat(this.value))">
                                        ${generateTimeOptions().map(opt => `<option value="${opt}" ${opt === taskTime ? 'selected' : ''}>${opt}h</option>`).join('')}
                                    </select>
                                </div>
                            </div>
                            ${taskNotes[taskId] ? `<div class="task-note-display">${taskNotes[taskId]}</div>` : ''}
                        </div>
                        <div class="task-actions">
                            <button class="task-btn" onclick="moveTaskUp('${day}', '${courseKey}', '${category}', ${itemIndex})">▲</button>
                            <button class="task-btn" onclick="moveTaskDown('${day}', '${courseKey}', '${category}', ${itemIndex})">▼</button>
                            <button class="task-btn ${isScheduled ? 'scheduled' : ''}" onclick="toggleScheduled('${taskId}')" title="Schedule in Calendar">📅</button>
                            <button class="task-btn ${taskNotes[taskId] ? 'has-note' : ''}" onclick="toggleNoteEditor('${taskId}')" title="Add Note">📝</button>
                        </div>
                    `;
                    
                    // Add note editor (hidden by default)
                    const noteEditor = document.createElement('div');
                    noteEditor.id = `note-editor-${taskId.replace(/\|\|\|/g, '-')}`;
                    noteEditor.className = 'task-note-editor';
                    noteEditor.style.display = 'none';
                    noteEditor.innerHTML = `
                        <textarea class="task-note-textarea" placeholder="Add a note...">${taskNotes[taskId] || ''}</textarea>
                        <button class="note-save-btn" onclick="saveTaskNote('${taskId}', this.previousElementSibling.value)">Save Note</button>
                    `;
                    taskItem.querySelector('.task-details').appendChild(noteEditor);
                    
                    categoryContent.appendChild(taskItem);
                    
                    // If scheduled, update calendar link
                    if (isScheduled && !isTaskComplete) {
                        const calBtn = taskItem.querySelector('.task-btn.scheduled');
                        calBtn.onclick = () => {
                            const link = createGoogleCalendarLink(
                                `[HW] ${courseName}: ${item.title}`,
                                `Course: ${courseName}\nTask: ${item.title}\nDue: ${formatDueDate(day, courseName)}`,
                                taskTime,
                                taskId
                            );
                            window.open(link, '_blank');
                        };
                    }
                });
                
                courseContent.appendChild(categorySection);
            });
            
            dayContent.appendChild(courseSection);
        });
        
        content.appendChild(daySection);
    });
}

function toggleNoteEditor(taskId) {
    const editor = document.getElementById(`note-editor-${taskId.replace(/\|\|\|/g, '-')}`);
    if (editor) {
        editor.style.display = editor.style.display === 'none' ? 'block' : 'none';
    }
}

// Initial render
document.addEventListener('DOMContentLoaded', () => {
    renderCourseCards();
    renderTasks();
});
