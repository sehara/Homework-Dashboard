let completedTaskIds = JSON.parse(localStorage.getItem('completedTasks')) || [];
let scheduledTaskIds = JSON.parse(localStorage.getItem('scheduledTasks')) || [];
let customTimeEstimates = JSON.parse(localStorage.getItem('customTimeEstimates')) || {};
let taskNotes = JSON.parse(localStorage.getItem('taskNotes')) || {};
let customTaskTitles = JSON.parse(localStorage.getItem('customTaskTitles')) || {};
let collapsedDays = JSON.parse(localStorage.getItem('collapsedDays')) || [];
let collapsedCourses = JSON.parse(localStorage.getItem('collapsedCourses')) || [];

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

function calculateHoursLeft(dueDateTimeStr) {
    try {
        const cleanDate = dueDateTimeStr.replace('at ', '');
        const dueDate = new Date(cleanDate + ", 2026");
        const now = new Date();
        const diffHrs = (dueDate - now) / (1000 * 60 * 60);
        return diffHrs > 0 ? diffHrs.toFixed(1) : "0.0";
    } catch (e) { return "--"; }
}

function createGoogleCalendarLink(title, description, duration, taskId) {
    const baseUrl = 'https://calendar.google.com/calendar/u/0/r/eventedit';
    const text = encodeURIComponent(title);
    const details = encodeURIComponent(description + (taskNotes[taskId] ? `\n\nNotes:\n${taskNotes[taskId]}` : ''));
    const now = new Date();
    const startTime = new Date(now.getTime() + 30 * 60000); 
    const endTime = new Date(startTime.getTime() + duration * 3600000);
    const format = (d) => d.toISOString().replace(/-|:|\.\d\d\d/g, "");
    return `${baseUrl}?text=${text}&details=${details}&dates=${format(startTime)}/${format(endTime)}`;
}

function renderTasks() {
    const content = document.getElementById('content');
    const courseCards = document.getElementById('courseCards');
    content.innerHTML = ''; courseCards.innerHTML = '';
    const now = new Date();

    Object.entries(courseData).forEach(([day, courses]) => {
        const dayId = day.replace(/[^a-z0-9]/gi, '');
        const daySection = document.createElement('div');
        daySection.className = 'day-section';
        
        const dayHeader = document.createElement('div');
        dayHeader.className = `day-header ${collapsedDays.includes(dayId) ? 'collapsed' : ''}`;
        dayHeader.innerHTML = `<span>${day}</span><span class="arrow">▼</span>`;
        dayHeader.onclick = () => {
            const idx = collapsedDays.indexOf(dayId);
            if (idx > -1) collapsedDays.splice(idx, 1); else collapsedDays.push(dayId);
            localStorage.setItem('collapsedDays', JSON.stringify(collapsedDays));
            renderTasks();
        };
        daySection.appendChild(dayHeader);

        const dayContent = document.createElement('div');
        dayContent.className = `day-content ${collapsedDays.includes(dayId) ? 'collapsed' : ''}`;

        Object.entries(courses).forEach(([courseKey, categories]) => {
            const [courseName, dueInfo] = courseKey.split('|||');
            const cleanDateStr = dueInfo.replace('Due: ', '').replace('at ', '');
            const sessionTime = new Date(cleanDateStr + ", 2026");
            if (sessionTime < now) return; 

            const courseId = (day + courseName).replace(/[^a-z0-9]/gi, '');
            const section = document.createElement('div');
            section.className = 'course-section';
            
            const courseHeader = document.createElement('div');
            courseHeader.className = `course-header ${collapsedCourses.includes(courseId) ? 'collapsed' : ''}`;
            courseHeader.innerHTML = `<div class="course-title">${courseName}</div><div class="course-due">${dueInfo}</div><span class="course-arrow">▼</span>`;
            courseHeader.onclick = () => {
                const idx = collapsedCourses.indexOf(courseId);
                if (idx >
