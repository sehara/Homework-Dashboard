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

// Render functions
function renderCourseCards() {
    const courseCards = document.getElementById('courseCards');
    courseCards.innerHTML = '';

    const courseStats = {};
    
    // NEW: Build map of NEXT (future) class date for each course
    const nextClassDates = {};
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    // First pass: find the earliest FUTURE date for each course
    Object.keys(courseData).forEach(day => {
        const taskDate = new Date(day);
        taskDate.setHours(0, 0, 0, 0);
        
        // Skip past dates
        if (taskDate < now) return;
        
        Object.keys(courseData[day]).forEach(courseKey => {
            const [courseName] = courseKey.split('|||');
            
            // Store the first future date we find for this course
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
        const card = document.createElement('div');
        card.className = 'course-card';
        
        if (stats.remaining === 0) {
            card.classList.add('completed');
        } else if (stats.remainingHours <= 2) {
            card.classList.add('low-workload');
        } else if (stats.remainingHours <= 5) {
            card.classList.add('medium-workload');
        } else {
            card.classList.add('high-workload');
        }

        if (stats.remaining === 0) {
            card.innerHTML = `
                <div class="course-card-title">${courseName}</div>
                <div class="course-card-hours">✅</div>
                <div class="course-card-hours-label">COMPLETE</div>
                <div class="course-card-tasks">${stats.total} tasks done</div>
                <div class="course-card-due">📅 ${courseInfo[courseName].due}</div>
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
                <div class="course-card-due">📅 ${courseInfo[courseName].due}</div>
            `;
        }

        courseCards.appendChild(card);
    });
}

function renderTasks() {
    const content = document.getElementById('content');
    content.innerHTML = '';

    const { active, archived } = filterAndOrganizeData();

    // Render active tasks
    Object.keys(active).forEach(day => {
        const daySection = document.createElement('div');
        daySection.className = 'day-section';

        const dayHeader = document.createElement('div');
        dayHeader.className = 'day-header';
        if (collapsedDays.includes(day)) {
            dayHeader.classList.add('collapsed');
        }
        dayHeader.innerHTML = `<span>${day}</span><span class="arrow">▼</span>`;
        dayHeader.addEventListener('click', () => toggleDay(day));
        daySection.appendChild(dayHeader);

        const dayContent = document.createElement('div');
        dayContent.className = 'day-content';
        if (collapsedDays.includes(day)) {
            dayContent.classList.add('collapsed');
        }

        Object.keys(active[day]).forEach(courseKey => {
            const [courseName, due] = courseKey.split('|||');
            const courseId = `${day}|||${courseKey}`;
            const courseTaskData = active[day][courseKey];
            
            const courseSection = document.createElement('div');
            courseSection.className = 'course-section';

            const courseHeader = document.createElement('div');
            courseHeader.className = 'course-header';
            if (collapsedCourses.includes(courseId)) {
                courseHeader.classList.add('collapsed');
            }
            const syllabusUrl = courseInfo[courseName] ? courseInfo[courseName].syllabusUrl : '';
            courseHeader.innerHTML = `
                <div>
                    <div class="course-title">
                        ${courseName}
                        ${syllabusUrl ? `<a href="${syllabusUrl}" target="_blank" class="course-syllabus-link" onclick="event.stopPropagation()" title="View Syllabus">📄</a>` : ''}
                    </div>
                    <div class="course-due">${due}</div>
                </div>
                <span class="course-arrow">▼</span>
            `;
            courseHeader.addEventListener('click', () => toggleCourse(courseId));
            courseSection.appendChild(courseHeader);

            const courseContent = document.createElement('div');
            courseContent.className = 'course-content';
            if (collapsedCourses.includes(courseId)) {
                courseContent.classList.add('collapsed');
            }

            const defaultOrder = ['submit', 'reading', 'required', 'optional'];
            const order = categoryOrder[courseId] || defaultOrder;

            const categoryTitles = {
                'submit': '🎯 SUBMIT (Actual Submission Required)',
                'reading': '📖 READING (Required for Class)',
                'required': '📖 REQUIRED READINGS',
                'optional': '💡 OPTIONAL READINGS'
            };

            const deletedInCourse = [];

            order.forEach(category => {
                const categoryId = `${courseId}|||${category}`;
                const categoryKey = getCategoryKey(day, courseKey, category);
                const items = courseTaskData[category];
                
                const isDeleted = deletedCategories.includes(categoryKey);
                if (isDeleted) {
                    deletedInCourse.push({ category, title: categoryTitles[category] });
                    return;
                }

                const isEmpty = items.length === 0;
                const allCompleted = items.length > 0 && items.every((item, itemIndex) => {
                    const taskId = getTaskKey(day, courseKey, category, itemIndex);
                    return completedTaskIds.includes(taskId);
                });
                const shouldGrayOut = isEmpty || allCompleted;
                
                const categoryDiv = document.createElement('div');
                categoryDiv.className = 'task-category';

                const categoryTitle = document.createElement('div');
                categoryTitle.className = 'category-title';
                if (collapsedCategories.includes(categoryId)) {
                    categoryTitle.classList.add('collapsed');
                }
                if (shouldGrayOut) {
                    categoryTitle.classList.add('grayed-out');
                }
                
                const statusIcon = (allCompleted && !isEmpty) ? '✓ ' : '';
                
                const leftDiv = document.createElement('div');
                leftDiv.className = 'category-title-left';
                const assignmentsUrl = courseInfo[courseName] ? courseInfo[courseName].assignmentsUrl : '';
                const assignmentsLink = (category === 'submit' && assignmentsUrl) ? `<a href="${assignmentsUrl}" target="_blank" class="category-assignments-link" onclick="event.stopPropagation()" title="View Assignments">🔗</a>` : '';
                leftDiv.innerHTML = `
                    <span class="category-status">${statusIcon}</span>
                    <span>${categoryTitles[category]}</span>
                    ${assignmentsLink}
                `;

                const rightDiv = document.createElement('div');
                rightDiv.className = 'category-title-right';
                
                const controls = document.createElement('div');
                controls.className = 'category-controls';
                
                const upBtn = document.createElement('button');
                upBtn.className = 'category-btn';
                upBtn.textContent = '↑';
                upBtn.onclick = (e) => {
                    e.stopPropagation();
                    moveCategoryUp(day, courseKey, category);
                };
                
                const downBtn = document.createElement('button');
                downBtn.className = 'category-btn';
                downBtn.textContent = '↓';
                downBtn.onclick = (e) => {
                    e.stopPropagation();
                    moveCategoryDown(day, courseKey, category);
                };

                controls.appendChild(upBtn);
                controls.appendChild(downBtn);

                if (shouldGrayOut) {
                    const deleteBtn = document.createElement('button');
                    deleteBtn.className = 'category-btn delete-btn';
                    deleteBtn.textContent = '🗑️';
                    deleteBtn.onclick = (e) => {
                        e.stopPropagation();
                        deleteCategory(day, courseKey, category);
                    };
                    controls.appendChild(deleteBtn);
                }

                rightDiv.appendChild(controls);
                
                const arrow = document.createElement('span');
                arrow.className = 'category-arrow';
                arrow.textContent = '▼';
                rightDiv.appendChild(arrow);

                categoryTitle.appendChild(leftDiv);
                categoryTitle.appendChild(rightDiv);
                
                categoryTitle.addEventListener('click', () => toggleCategory(categoryId));
                categoryDiv.appendChild(categoryTitle);

                const categoryContent = document.createElement('div');
                categoryContent.className = 'category-content';
                if (collapsedCategories.includes(categoryId)) {
                    categoryContent.classList.add('collapsed');
                }
                
                if (items.length === 0) {
                    const emptyDiv = document.createElement('div');
                    emptyDiv.className = 'category-empty';
                    emptyDiv.textContent = 'None';
                    categoryContent.appendChild(emptyDiv);
                } else {
                    const taskKey = `${day}|||${courseKey}|||${category}`;
                    const defaultTaskOrder = items.map((_, i) => i);
                    const orderedIndices = taskOrder[taskKey] || defaultTaskOrder;

                    orderedIndices.forEach(itemIndex => {
                        const item = items[itemIndex];
                        const taskId = getTaskKey(day, courseKey, category, itemIndex);
                        const isCompleted = completedTaskIds.includes(taskId);
                        const isScheduled = scheduledTaskIds.includes(taskId);

                        const taskItem = document.createElement('div');
                        let taskClasses = 'task-item';
                        if (isCompleted) taskClasses += ' completed';
                        else if (isScheduled) taskClasses += ' scheduled';
                        taskItem.className = taskClasses;

                        const checkbox = document.createElement('input');
                        checkbox.type = 'checkbox';
                        checkbox.className = 'task-checkbox';
                        checkbox.checked = isCompleted;
                        checkbox.addEventListener('change', () => toggleTask(taskId));

                        const details = document.createElement('div');
                        details.className = 'task-details';

                        const titleContainer = document.createElement('div');
                        titleContainer.style.display = 'flex';
                        titleContainer.style.alignItems = 'center';
                        titleContainer.style.gap = '8px';
                        
                        const title = document.createElement('span');
                        title.className = 'task-title';
                        const customTitle = customTaskTitles[taskId] || item.title;
                        title.textContent = customTitle;
                        title.contentEditable = false;
                        title.style.cursor = 'text';
                        
                        title.addEventListener('dblclick', () => {
                            title.contentEditable = true;
                            title.focus();
                            const range = document.createRange();
                            range.selectNodeContents(title);
                            const sel = window.getSelection();
                            sel.removeAllRanges();
                            sel.addRange(range);
                        });
                        
                        title.addEventListener('blur', () => {
                            title.contentEditable = false;
                            const newTitle = title.textContent.trim();
                            if (newTitle && newTitle !== item.title) {
                                customTaskTitles[taskId] = newTitle;
                                localStorage.setItem('customTaskTitles', JSON.stringify(customTaskTitles));
                            }
                        });
                        
                        title.addEventListener('keydown', (e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                title.blur();
                            }
                        });
                        
                        const linkIcon = document.createElement('a');
                        linkIcon.href = item.link;
                        linkIcon.target = '_blank';
                        linkIcon.textContent = '🔗';
                        linkIcon.style.fontSize = '0.9em';
                        linkIcon.style.opacity = '0.5';
                        linkIcon.style.textDecoration = 'none';
                        linkIcon.style.transition = 'opacity 0.2s';
                        linkIcon.addEventListener('mouseenter', () => linkIcon.style.opacity = '1');
                        linkIcon.addEventListener('mouseleave', () => linkIcon.style.opacity = '0.5');
                        
                        titleContainer.appendChild(title);
                        titleContainer.appendChild(linkIcon);

                        const meta = document.createElement('div');
                        meta.className = 'task-meta';
                        
                        const currentTime = getTaskTime(taskId, item.time);
                        const timeSelect = document.createElement('select');
                        timeSelect.className = 'task-time-select';
                        const timeOptions = generateTimeOptions();
                        timeOptions.forEach(optTime => {
                            const option = document.createElement('option');
                            option.value = optTime;
                            option.textContent = `⏱️ ${formatTime(optTime)}`;
                            if (optTime === currentTime) {
                                option.selected = true;
                            }
                            timeSelect.appendChild(option);
                        });
                        timeSelect.addEventListener('change', (e) => {
                            updateTaskTime(taskId, parseFloat(e.target.value));
                        });

                        if (item.points !== null) {
                            const pointsSpan = document.createElement('span');
                            pointsSpan.className = 'task-points';
                            pointsSpan.textContent = `${item.points} pts`;
                            meta.appendChild(pointsSpan);
                        }

                        const calendarBtn = document.createElement('button');
                        calendarBtn.className = 'task-calendar-link';
                        if (isScheduled) {
                            calendarBtn.classList.add('scheduled');
                            calendarBtn.textContent = '✓ Scheduled';
                        } else {
                            calendarBtn.textContent = '📅 Add to Calendar';
                        }
                        calendarBtn.onclick = (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!isScheduled) {
                                const calDescription = `Canvas Link: ${item.link}`;
                                const durationMinutes = Math.round(currentTime * 60);
                                const calendarTitle = `(${durationMinutes}min) HW: ${courseName}: ${item.title}`;
                                const calLink = createGoogleCalendarLink(calendarTitle, calDescription, currentTime, taskId);
                                window.open(calLink, '_blank');
                            }
                            toggleScheduled(taskId);
                        };

                        const notesBtn = document.createElement('button');
                        notesBtn.className = 'task-notes-btn';
                        const hasNotes = taskNotes[taskId] && taskNotes[taskId].trim() !== '';
                        if (hasNotes) {
                            notesBtn.classList.add('has-notes');
                        }
                        notesBtn.textContent = hasNotes ? '📝 Notes' : '📝';
                        notesBtn.onclick = (e) => {
                            e.stopPropagation();
                            const notesArea = taskItem.querySelector('.task-notes-area');
                            const textarea = notesArea.querySelector('.task-notes-textarea');
                            if (notesArea.style.display === 'none' || !notesArea.style.display) {
                                notesArea.style.display = 'block';
                                setTimeout(() => {
                                    textarea.style.height = 'auto';
                                    textarea.style.height = Math.max(80, textarea.scrollHeight) + 'px';
                                }, 0);
                            } else {
                                notesArea.style.display = 'none';
                            }
                        };

                        meta.appendChild(timeSelect);
                        meta.appendChild(notesBtn);
                        meta.appendChild(calendarBtn);

                        details.appendChild(titleContainer);
                        details.appendChild(meta);

                        const notesArea = document.createElement('div');
                        notesArea.className = 'task-notes-area';
                        notesArea.style.display = 'none';

                        const notesTextarea = document.createElement('textarea');
                        notesTextarea.className = 'task-notes-textarea';
                        notesTextarea.placeholder = 'Add notes for this task...';
                        notesTextarea.value = taskNotes[taskId] || '';
                        
                        const autoExpand = () => {
                            notesTextarea.style.height = 'auto';
                            notesTextarea.style.height = Math.max(80, notesTextarea.scrollHeight) + 'px';
                        };
                        notesTextarea.addEventListener('input', autoExpand);
                        setTimeout(autoExpand, 0);

                        const notesSaveBtn = document.createElement('button');
                        notesSaveBtn.className = 'task-notes-save';
                        notesSaveBtn.textContent = 'Save Notes';
                        notesSaveBtn.onclick = (e) => {
                            e.stopPropagation();
                            saveTaskNote(taskId, notesTextarea.value);
                            notesArea.style.display = 'none';
                        };

                        notesArea.appendChild(notesTextarea);
                        notesArea.appendChild(notesSaveBtn);
                        details.appendChild(notesArea);

                        const taskControls = document.createElement('div');
                        taskControls.className = 'task-controls';

                        const taskUpBtn = document.createElement('button');
                        taskUpBtn.className = 'task-btn';
                        taskUpBtn.textContent = '↑';
                        taskUpBtn.onclick = (e) => {
                            e.stopPropagation();
                            moveTaskUp(day, courseKey, category, itemIndex);
                        };

                        const taskDownBtn = document.createElement('button');
                        taskDownBtn.className = 'task-btn';
                        taskDownBtn.textContent = '↓';
                        taskDownBtn.onclick = (e) => {
                            e.stopPropagation();
                            moveTaskDown(day, courseKey, category, itemIndex);
                        };

                        taskControls.appendChild(taskUpBtn);
                        taskControls.appendChild(taskDownBtn);

                        taskItem.appendChild(checkbox);
                        taskItem.appendChild(details);
                        taskItem.appendChild(taskControls);

                        categoryContent.appendChild(taskItem);
                    });
                }

                categoryDiv.appendChild(categoryContent);
                courseContent.appendChild(categoryDiv);
            });

            if (deletedInCourse.length > 0) {
                const restoreSection = document.createElement('div');
                restoreSection.className = 'restore-section';
                
                const restoreTitle = document.createElement('div');
                restoreTitle.className = 'restore-title';
                restoreTitle.textContent = '🔄 Deleted Sections (Click to Restore)';
                restoreSection.appendChild(restoreTitle);

                deletedInCourse.forEach(({ category, title }) => {
                    const restoreBtn = document.createElement('button');
                    restoreBtn.className = 'restore-btn';
                    restoreBtn.textContent = title;
                    restoreBtn.onclick = () => restoreCategory(day, courseKey, category);
                    restoreSection.appendChild(restoreBtn);
                });

                courseContent.appendChild(restoreSection);
            }

            courseSection.appendChild(courseContent);
            dayContent.appendChild(courseSection);
        });

        daySection.appendChild(dayContent);
        content.appendChild(daySection);
    });

    // Render archived tasks
    if (Object.keys(archived).length > 0) {
        const archiveSection = document.createElement('div');
        archiveSection.className = 'day-section';
        archiveSection.style.marginTop = '40px';

        const archiveHeader = document.createElement('div');
        archiveHeader.className = 'day-header';
        archiveHeader.style.background = 'linear-gradient(135deg, #6c757d 0%, #495057 100%)';
        const archiveCollapsed = collapsedDays.includes('__archive__');
        if (archiveCollapsed) {
            archiveHeader.classList.add('collapsed');
        }
        archiveHeader.innerHTML = `<span>📦 Archived Tasks (Past Due)</span><span class="arrow">▼</span>`;
        archiveHeader.addEventListener('click', () => toggleDay('__archive__'));
        archiveSection.appendChild(archiveHeader);

        const archiveContent = document.createElement('div');
        archiveContent.className = 'day-content';
        if (archiveCollapsed) {
            archiveContent.classList.add('collapsed');
        }

        Object.keys(archived).forEach(day => {
            Object.keys(archived[day]).forEach(courseKey => {
                const [courseName, due] = courseKey.split('|||');
                const courseId = `${day}|||${courseKey}`;
                const courseTaskData = archived[day][courseKey];
                
                const courseSection = document.createElement('div');
                courseSection.className = 'course-section';
                courseSection.style.opacity = '0.6';

                const courseHeader = document.createElement('div');
                courseHeader.className = 'course-header';
                courseHeader.innerHTML = `
                    <div>
                        <div class="course-title">${courseName} - ${day}</div>
                    </div>
                `;

                courseSection.appendChild(courseHeader);
                archiveContent.appendChild(courseSection);
            });
        });

        archiveSection.appendChild(archiveContent);
        content.appendChild(archiveSection);
    }

    renderCourseCards();
}

// Toggle functions
function toggleDay(day) {
    if (collapsedDays.includes(day)) {
        collapsedDays = collapsedDays.filter(d => d !== day);
    } else {
        collapsedDays.push(day);
    }
    localStorage.setItem('collapsedDays', JSON.stringify(collapsedDays));
    renderTasks();
}

function toggleCourse(courseId) {
    if (collapsedCourses.includes(courseId)) {
        collapsedCourses = collapsedCourses.filter(c => c !== courseId);
    } else {
        collapsedCourses.push(courseId);
    }
    localStorage.setItem('collapsedCourses', JSON.stringify(collapsedCourses));
    renderTasks();
}

function toggleCategory(categoryId) {
    if (collapsedCategories.includes(categoryId)) {
        collapsedCategories = collapsedCategories.filter(c => c !== categoryId);
    } else {
        collapsedCategories.push(categoryId);
    }
    localStorage.setItem('collapsedCategories', JSON.stringify(collapsedCategories));
    renderTasks();
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
}

// Update homework functionality
function startUpdateCountdown() {
    const banner = document.createElement('div');
    banner.id = 'updateBanner';
    banner.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #800000 0%, #5a0000 100%);
        color: white;
        padding: 20px 30px;
        border-radius: 15px;
        box-shadow: 0 8px 25px rgba(0,0,0,0.3);
        z-index: 9999;
        font-size: 1.1em;
        font-weight: bold;
        min-width: 300px;
    `;
    
    let secondsLeft = 120;
    
    const updateBannerText = () => {
        const minutes = Math.floor(secondsLeft / 60);
        const seconds = secondsLeft % 60;
        banner.innerHTML = `
            <div style="margin-bottom: 10px;">⏳ Updating homework...</div>
            <div style="font-size: 2em; text-align: center;">${minutes}:${seconds.toString().padStart(2, '0')}</div>
            <div style="font-size: 0.8em; opacity: 0.8; margin-top: 10px; text-align: center;">Auto-refresh in progress</div>
        `;
    };
    
    updateBannerText();
    document.body.appendChild(banner);
    
    const countdownInterval = setInterval(() => {
        secondsLeft--;
        updateBannerText();
        
        if (secondsLeft <= 0) {
            clearInterval(countdownInterval);
            banner.innerHTML = '<div>🔄 Refreshing...</div>';
            
            setTimeout(() => {
                if (Notification.permission === 'granted') {
                    new Notification('🎓 Homework Updated!', {
                        body: 'Your tracker has been refreshed with new assignments.',
                        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">📚</text></svg>'
                    });
                }
                location.reload();
            }, 500);
        }
    }, 1000);
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '❌ Cancel';
    cancelBtn.style.cssText = `
        background: white;
        color: #800000;
        border: none;
        padding: 8px 20px;
        border-radius: 8px;
        cursor: pointer;
        font-weight: bold;
        margin-top: 15px;
        width: 100%;
    `;
    cancelBtn.onclick = () => {
        clearInterval(countdownInterval);
        banner.remove();
    };
    banner.appendChild(cancelBtn);
}

function updateHomework() {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        padding: 40px;
        border-radius: 20px;
        max-width: 700px;
        max-height: 80vh;
        overflow-y: auto;
    `;
    
    const instructions = `
Update my homework tracker with new Canvas data.

**I've attached my current homework_tracker_updated.html file.**

Courses to scrape:
1. Managing in Organizations: https://canvas.uchicago.edu/courses/67742/modules
2. PE VC Lab: https://canvas.uchicago.edu/courses/65932/modules
3. Negotiation: https://canvas.uchicago.edu/courses/67439/modules
4. Corporate Governance: https://canvas.uchicago.edu/courses/69195/modules

For each course:
- Extract ALL homework items (readings, assignments, submissions) for the next 2 weeks
- Include readings even if there's no assignment due
- Categorize as: submit, reading, required, or optional
- If it's listed under Canvas Assignments, put it in "submit" even if 0 points
- Estimate time needed (in hours, use 0.5 hour increments)
- Get the Canvas link for each item
- Use exact Canvas due dates and times

Format the data like this:
{
  "Monday, January 5, 2026": {
    "PE VC Lab|||Due: Monday, Jan 5 at 11:59 PM": {
      submit: [{title: "...", time: 0.5, points: null, link: "..."}],
      reading: [{title: "...", time: 1.0, points: null, link: "..."}],
      required: [],
      optional: []
    }
  }
}

IMPORTANT FORMATTING:
- Use JavaScript object notation (no quotes around keys like submit, reading)
- Use "points: null" for readings (not 0)
- Day of week must be correct (check calendar)
- Course names: "PE VC Lab", "Managing in Organizations", "Negotiation", "Corporate Governance"

Then:
1. Read the attached homework_tracker_updated.html file
2. Find the courseData object (search for "const courseData")
3. Replace ONLY the courseData object with new scraped data
4. Find the courseInfo object (search for "const courseInfo")
5. Update courseInfo with correct first due dates for each course
6. Keep everything else exactly the same (all JavaScript, CSS, HTML)
7. Save as: homework_tracker_updated.html
8. Give me the download link

CRITICAL:
- Use "reading" NOT "prepare" in categories
- Update BOTH courseData AND courseInfo
- Verify all 4 courses appear in courseInfo with correct due dates
- Include dates with only readings (no submissions)
- The file I attached has all the working code - don't change anything except courseData and courseInfo
    `.trim();
    
    modalContent.innerHTML = `
        <h2 style="color: #800000; margin-bottom: 20px;">🔄 Update Homework</h2>
        <div style="background: #fff3cd; border: 2px solid #ffc107; border-radius: 10px; padding: 15px; margin-bottom: 20px;">
            <p style="margin: 0; font-weight: bold; color: #856404;">📎 IMPORTANT: When you paste into Manus, attach your current <code>homework_tracker_updated.html</code> file!</p>
        </div>
        <p style="margin-bottom: 20px; font-size: 1.1em;">Copy these instructions and paste them in a new Manus chat:</p>
        <textarea readonly id="instructionsText" style="
            width: 100%;
            height: 400px;
            padding: 15px;
            font-family: monospace;
            font-size: 0.9em;
            border: 2px solid #dee2e6;
            border-radius: 8px;
            margin-bottom: 20px;
            resize: vertical;
        ">${instructions}</textarea>
        <div style="display: flex; gap: 15px; justify-content: flex-end;">
            <button onclick="this.parentElement.parentElement.parentElement.remove()" style="
                background: #6c757d;
                color: white;
                border: none;
                padding: 12px 30px;
                font-size: 1em;
                font-weight: bold;
                border-radius: 8px;
                cursor: pointer;
            ">Close</button>
            <button id="copyButton" onclick="
                const textarea = document.getElementById('instructionsText');
                
                textarea.select();
                document.execCommand('copy');
                this.textContent = '\u2705 Copied!';
                
                setTimeout(() => this.textContent = '\ud83d\udccb Copy & Open Manus', 2000);
                window.open('https://manus.im', '_blank');
                
                if (Notification.permission === 'default') {
                    Notification.requestPermission();
                }
                
                setTimeout(() => {
                    this.parentElement.parentElement.parentElement.remove();
                    startUpdateCountdown();
                }, 2000);
            " style="
                background: #800000;
                color: white;
                border: none;
                padding: 12px 30px;
                font-size: 1em;
                font-weight: bold;
                border-radius: 8px;
                cursor: pointer;
            ">📋 Copy & Open Manus</button>
        </div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Initialize on page load
renderTasks();
