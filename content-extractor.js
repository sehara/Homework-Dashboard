/**
 * Task Box Content Extractor
 * Browser script for extracting content, estimating time with AI,
 * finding optimal calendar slots, and syncing with Google Calendar
 */

(function() {
    'use strict';

    // Task data storage
    let currentTask = {
        content: '',
        estimatedMinutes: null,
        estimatedTime: null,
        complexity: null,
        optimalSlot: null,
        calendarEventId: null
    };

    let archivedTasks = JSON.parse(localStorage.getItem('archivedTasks') || '[]');

    // Peak cognitive performance times (24-hour format)
    const PEAK_HOURS = {
        morning: { start: 9, end: 12, score: 1.0 },      // Best for complex tasks
        earlyAfternoon: { start: 14, end: 16, score: 0.8 }, // Good for moderate tasks
        lateAfternoon: { start: 16, end: 18, score: 0.6 },  // Decent for lighter tasks
        evening: { start: 18, end: 21, score: 0.4 }         // Not ideal but acceptable
    };

    /**
     * Main TaskExtractor class
     */
    class TaskExtractor {
        constructor() {
            this.apiKeys = {
                gemini: localStorage.getItem('geminiApiKey') || '',
                calendar: localStorage.getItem('calendarApiKey') || ''
            };

            // Load API keys from inputs if available
            this.loadApiKeys();
        }

        /**
         * Load API keys from localStorage or input fields
         */
        loadApiKeys() {
            const geminiInput = document.getElementById('geminiApiKey');
            const calendarInput = document.getElementById('calendarApiKey');

            if (geminiInput && this.apiKeys.gemini) {
                geminiInput.value = this.apiKeys.gemini;
            }
            if (calendarInput && this.apiKeys.calendar) {
                calendarInput.value = this.apiKeys.calendar;
            }

            // Add event listeners to save keys when changed
            if (geminiInput) {
                geminiInput.addEventListener('change', (e) => {
                    this.apiKeys.gemini = e.target.value;
                    localStorage.setItem('geminiApiKey', e.target.value);
                });
            }
            if (calendarInput) {
                calendarInput.addEventListener('change', (e) => {
                    this.apiKeys.calendar = e.target.value;
                    localStorage.setItem('calendarApiKey', e.target.value);
                });
            }
        }

        /**
         * Extract content from the task box
         */
        extractContent() {
            const taskTextarea = document.getElementById('taskContent');
            if (!taskTextarea) {
                this.showError('Task box not found');
                return null;
            }

            const content = taskTextarea.value.trim();
            if (!content) {
                this.showError('Task box is empty');
                return null;
            }

            currentTask.content = content;

            this.showInfo(`
                <strong>✅ Content Extracted:</strong><br>
                <em>"${content.substring(0, 100)}${content.length > 100 ? '...' : ''}"</em><br>
                <small>Length: ${content.length} characters</small>
            `);

            return content;
        }

        /**
         * Analyze task using AI (Gemini) to estimate completion time
         */
        async analyzeTask() {
            const content = this.extractContent();
            if (!content) return;

            const geminiKey = document.getElementById('geminiApiKey')?.value || this.apiKeys.gemini;
            if (!geminiKey) {
                this.showError('Please enter a Gemini API key first');
                return;
            }

            this.showInfo('🤖 Analyzing task with AI...');

            try {
                const response = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiKey}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{
                                parts: [{
                                    text: `Analyze this task and estimate how long it will take to complete. Provide your response in this exact JSON format:
{
  "estimatedMinutes": <number>,
  "complexity": "<easy|medium|hard>",
  "reasoning": "<brief explanation>"
}

Task: "${content}"

Be realistic with time estimates. Consider research, execution, and review time.`
                                }]
                            }]
                        })
                    }
                );

                const data = await response.json();
                const text = data.candidates[0].content.parts[0].text;

                // Extract JSON from response (handle markdown code blocks)
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (!jsonMatch) {
                    throw new Error('Could not parse AI response');
                }

                const analysis = JSON.parse(jsonMatch[0]);

                currentTask.estimatedMinutes = analysis.estimatedMinutes;
                currentTask.complexity = analysis.complexity;
                currentTask.estimatedTime = this.formatMinutes(analysis.estimatedMinutes);

                // Update rating badge
                const ratingBadge = document.getElementById('ratingBadge');
                if (ratingBadge) {
                    ratingBadge.textContent = currentTask.estimatedTime;
                    ratingBadge.className = `rating-badge rating-${analysis.complexity}`;
                    ratingBadge.style.display = 'block';
                }

                this.showInfo(`
                    <strong>✅ Task Analyzed:</strong><br>
                    ⏱️ <strong>Estimated Time:</strong> ${currentTask.estimatedTime}<br>
                    📊 <strong>Complexity:</strong> ${analysis.complexity}<br>
                    💭 <strong>Reasoning:</strong> ${analysis.reasoning}
                `);

            } catch (error) {
                this.showError(`AI Analysis failed: ${error.message}`);
                console.error('Analysis error:', error);
            }
        }

        /**
         * Find optimal calendar slot based on availability and cognitive performance
         */
        async findOptimalSlot() {
            if (!currentTask.estimatedMinutes) {
                this.showError('Please analyze the task first to estimate time');
                return;
            }

            const calendarKey = document.getElementById('calendarApiKey')?.value || this.apiKeys.calendar;
            if (!calendarKey) {
                // If no API key, use heuristic approach
                this.findOptimalSlotHeuristic();
                return;
            }

            this.showInfo('🔍 Searching for optimal time slot...');

            try {
                // Get calendar events for next 7 days
                const events = await this.getCalendarEvents(calendarKey);
                const optimalSlot = this.calculateOptimalSlot(events, currentTask.estimatedMinutes);

                currentTask.optimalSlot = optimalSlot;

                this.showInfo(`
                    <strong>✅ Optimal Slot Found:</strong><br>
                    📅 <strong>Date:</strong> ${optimalSlot.start.toLocaleDateString()}<br>
                    ⏰ <strong>Time:</strong> ${this.formatTime(optimalSlot.start)} - ${this.formatTime(optimalSlot.end)}<br>
                    🎯 <strong>Cognitive Score:</strong> ${(optimalSlot.cognitiveScore * 100).toFixed(0)}%<br>
                    💡 <strong>Reason:</strong> ${optimalSlot.reason}
                `);

            } catch (error) {
                this.showError(`Failed to find optimal slot: ${error.message}`);
                console.error('Slot finding error:', error);
            }
        }

        /**
         * Heuristic-based optimal slot finder (when no API key)
         */
        findOptimalSlotHeuristic() {
            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);

            // Find next available peak performance slot
            let optimalStart;

            // Try morning slot (9-12)
            optimalStart = new Date(tomorrow);
            optimalStart.setHours(9, 0, 0, 0);

            const optimalEnd = new Date(optimalStart);
            optimalEnd.setMinutes(optimalEnd.getMinutes() + currentTask.estimatedMinutes);

            currentTask.optimalSlot = {
                start: optimalStart,
                end: optimalEnd,
                cognitiveScore: 1.0,
                reason: 'Morning slot (peak cognitive performance)'
            };

            this.showInfo(`
                <strong>✅ Optimal Slot Suggested:</strong><br>
                📅 <strong>Date:</strong> ${optimalStart.toLocaleDateString()}<br>
                ⏰ <strong>Time:</strong> ${this.formatTime(optimalStart)} - ${this.formatTime(optimalEnd)}<br>
                🎯 <strong>Cognitive Score:</strong> 100%<br>
                💡 <strong>Reason:</strong> ${currentTask.optimalSlot.reason}<br>
                <br>
                <small>⚠️ Add Google Calendar API key for real-time availability checking</small>
            `);
        }

        /**
         * Get calendar events using Google Calendar API
         */
        async getCalendarEvents(apiKey) {
            const now = new Date();
            const futureDate = new Date(now);
            futureDate.setDate(futureDate.getDate() + 7);

            const timeMin = now.toISOString();
            const timeMax = futureDate.toISOString();

            // Note: This requires OAuth2, simplified for demo
            const response = await fetch(
                `https://www.googleapis.com/calendar/v3/calendars/primary/events?key=${apiKey}&timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
                {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`
                    }
                }
            );

            if (!response.ok) {
                throw new Error('Calendar API request failed. Note: Full OAuth2 implementation required for production.');
            }

            const data = await response.json();
            return data.items || [];
        }

        /**
         * Calculate optimal slot based on availability and cognitive performance
         */
        calculateOptimalSlot(events, durationMinutes) {
            const now = new Date();
            const searchDays = 7;

            let bestSlot = null;
            let bestScore = -1;

            // Search through next 7 days
            for (let day = 0; day < searchDays; day++) {
                const currentDay = new Date(now);
                currentDay.setDate(currentDay.getDate() + day);
                currentDay.setHours(8, 0, 0, 0); // Start at 8 AM

                // Check each hour of the day
                for (let hour = 8; hour < 22; hour++) {
                    const slotStart = new Date(currentDay);
                    slotStart.setHours(hour, 0, 0, 0);

                    const slotEnd = new Date(slotStart);
                    slotEnd.setMinutes(slotEnd.getMinutes() + durationMinutes);

                    // Check if slot is in the past
                    if (slotStart < now) continue;

                    // Check if slot conflicts with existing events
                    const hasConflict = events.some(event => {
                        const eventStart = new Date(event.start.dateTime || event.start.date);
                        const eventEnd = new Date(event.end.dateTime || event.end.date);
                        return (slotStart < eventEnd && slotEnd > eventStart);
                    });

                    if (hasConflict) continue;

                    // Calculate cognitive performance score
                    const cognitiveScore = this.getCognitiveScore(hour);

                    // Prefer earlier days (slight preference)
                    const dayPenalty = day * 0.05;
                    const totalScore = cognitiveScore - dayPenalty;

                    if (totalScore > bestScore) {
                        bestScore = totalScore;
                        bestSlot = {
                            start: slotStart,
                            end: slotEnd,
                            cognitiveScore: cognitiveScore,
                            reason: this.getCognitiveReason(hour)
                        };
                    }
                }
            }

            return bestSlot || this.getDefaultSlot(durationMinutes);
        }

        /**
         * Get cognitive performance score for a given hour
         */
        getCognitiveScore(hour) {
            for (const [period, data] of Object.entries(PEAK_HOURS)) {
                if (hour >= data.start && hour < data.end) {
                    return data.score;
                }
            }
            return 0.3; // Low score for off-hours
        }

        /**
         * Get reason for cognitive score
         */
        getCognitiveReason(hour) {
            if (hour >= 9 && hour < 12) return 'Peak morning focus';
            if (hour >= 14 && hour < 16) return 'Good afternoon productivity';
            if (hour >= 16 && hour < 18) return 'Moderate afternoon energy';
            if (hour >= 18 && hour < 21) return 'Evening availability';
            return 'Off-peak hours';
        }

        /**
         * Get default slot if no optimal found
         */
        getDefaultSlot(durationMinutes) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(9, 0, 0, 0);

            const end = new Date(tomorrow);
            end.setMinutes(end.getMinutes() + durationMinutes);

            return {
                start: tomorrow,
                end: end,
                cognitiveScore: 1.0,
                reason: 'Default morning slot (peak performance)'
            };
        }

        /**
         * Sync task to Google Calendar
         */
        async syncToCalendar() {
            if (!currentTask.optimalSlot) {
                this.showError('Please find an optimal slot first');
                return;
            }

            const calendarKey = document.getElementById('calendarApiKey')?.value || this.apiKeys.calendar;

            if (!calendarKey) {
                // Fallback to creating a calendar link
                this.createCalendarLink();
                return;
            }

            this.showInfo('🔄 Syncing to Google Calendar...');

            try {
                const event = {
                    summary: `Task: ${currentTask.content.substring(0, 50)}...`,
                    description: currentTask.content,
                    start: {
                        dateTime: currentTask.optimalSlot.start.toISOString(),
                        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                    },
                    end: {
                        dateTime: currentTask.optimalSlot.end.toISOString(),
                        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                    },
                    reminders: {
                        useDefault: false,
                        overrides: [
                            { method: 'popup', minutes: 30 }
                        ]
                    }
                };

                // Note: This requires OAuth2, simplified for demo
                const response = await fetch(
                    `https://www.googleapis.com/calendar/v3/calendars/primary/events?key=${calendarKey}`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${calendarKey}`
                        },
                        body: JSON.stringify(event)
                    }
                );

                if (!response.ok) {
                    throw new Error('Calendar API request failed. Using fallback link method.');
                }

                const data = await response.json();
                currentTask.calendarEventId = data.id;

                this.showInfo(`
                    <strong>✅ Synced to Calendar!</strong><br>
                    📅 Event created successfully<br>
                    🔗 Event ID: ${data.id}
                `);

            } catch (error) {
                console.warn('API sync failed, using fallback:', error);
                this.createCalendarLink();
            }
        }

        /**
         * Create a Google Calendar link (fallback method)
         */
        createCalendarLink() {
            if (!currentTask.optimalSlot) {
                this.showError('Please find an optimal slot first');
                return;
            }

            const title = encodeURIComponent(`Task: ${currentTask.content.substring(0, 50)}`);
            const details = encodeURIComponent(currentTask.content);
            const start = this.formatDateTimeForCalendar(currentTask.optimalSlot.start);
            const end = this.formatDateTimeForCalendar(currentTask.optimalSlot.end);

            const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&dates=${start}/${end}`;

            window.open(calendarUrl, '_blank');

            this.showInfo(`
                <strong>✅ Calendar Link Created!</strong><br>
                A new tab has opened with your Google Calendar event.<br>
                Click "Save" in the calendar to add the event.<br>
                <br>
                <small>⚠️ Add Google Calendar API key with OAuth2 for automatic syncing</small>
            `);
        }

        /**
         * Mark task as done and archive it
         */
        async markAsDone() {
            if (!currentTask.content) {
                this.showError('No task to mark as done');
                return;
            }

            // Delete calendar event if it exists
            if (currentTask.calendarEventId) {
                await this.deleteCalendarEvent(currentTask.calendarEventId);
            }

            // Archive the task
            const archivedTask = {
                ...currentTask,
                completedAt: new Date().toISOString()
            };

            archivedTasks.push(archivedTask);
            localStorage.setItem('archivedTasks', JSON.stringify(archivedTasks));

            // Update archive display
            this.updateArchiveDisplay();

            // Clear current task
            currentTask = {
                content: '',
                estimatedMinutes: null,
                estimatedTime: null,
                complexity: null,
                optimalSlot: null,
                calendarEventId: null
            };

            // Clear task box
            const taskTextarea = document.getElementById('taskContent');
            if (taskTextarea) {
                taskTextarea.value = '';
            }

            // Hide rating badge
            const ratingBadge = document.getElementById('ratingBadge');
            if (ratingBadge) {
                ratingBadge.style.display = 'none';
            }

            this.showInfo(`
                <strong>✅ Task Marked as Done!</strong><br>
                Task has been moved to archive.<br>
                ${currentTask.calendarEventId ? 'Calendar event has been deleted.' : ''}
            `);
        }

        /**
         * Delete calendar event
         */
        async deleteCalendarEvent(eventId) {
            const calendarKey = document.getElementById('calendarApiKey')?.value || this.apiKeys.calendar;

            if (!calendarKey) {
                console.warn('No calendar API key, cannot delete event');
                return;
            }

            try {
                const response = await fetch(
                    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}?key=${calendarKey}`,
                    {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${calendarKey}`
                        }
                    }
                );

                if (!response.ok) {
                    throw new Error('Failed to delete calendar event');
                }

                console.log('Calendar event deleted successfully');
            } catch (error) {
                console.error('Failed to delete calendar event:', error);
            }
        }

        /**
         * Update archive display
         */
        updateArchiveDisplay() {
            const archiveContainer = document.getElementById('archiveContainer');
            if (!archiveContainer) return;

            if (archivedTasks.length === 0) {
                archiveContainer.innerHTML = '<div class="archive-item empty">No archived tasks</div>';
                return;
            }

            archiveContainer.innerHTML = archivedTasks
                .slice()
                .reverse()
                .map((task, index) => {
                    const completedDate = new Date(task.completedAt).toLocaleString();
                    return `
                        <div class="archive-item">
                            <strong>Task ${archivedTasks.length - index}:</strong> ${task.content.substring(0, 100)}${task.content.length > 100 ? '...' : ''}<br>
                            <small>✅ Completed: ${completedDate}</small>
                            ${task.estimatedTime ? `<br><small>⏱️ Estimated time: ${task.estimatedTime}</small>` : ''}
                        </div>
                    `;
                })
                .join('');
        }

        /**
         * Utility: Format minutes to readable time
         */
        formatMinutes(minutes) {
            if (minutes < 60) return `${minutes} min`;
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            if (mins === 0) return `${hours} hr${hours > 1 ? 's' : ''}`;
            return `${hours} hr${hours > 1 ? 's' : ''} ${mins} min`;
        }

        /**
         * Utility: Format time for display
         */
        formatTime(date) {
            return date.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
        }

        /**
         * Utility: Format datetime for Google Calendar URL
         */
        formatDateTimeForCalendar(date) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${year}${month}${day}T${hours}${minutes}00`;
        }

        /**
         * Show info message
         */
        showInfo(message) {
            const infoBox = document.getElementById('extractedInfo');
            if (infoBox) {
                infoBox.innerHTML = message;
                infoBox.style.borderColor = '#667eea';
            }
        }

        /**
         * Show error message
         */
        showError(message) {
            const infoBox = document.getElementById('extractedInfo');
            if (infoBox) {
                infoBox.innerHTML = `<strong style="color: #dc3545;">❌ Error:</strong> ${message}`;
                infoBox.style.borderColor = '#dc3545';
            }
        }
    }

    // Initialize and expose to window
    window.TaskExtractor = new TaskExtractor();

    // Load archived tasks on page load
    window.TaskExtractor.updateArchiveDisplay();

    console.log('✅ Task Box Content Extractor loaded successfully');
    console.log('Use window.TaskExtractor to access the API');

})();
