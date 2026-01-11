# Task Box Content Extractor

A browser script for extracting content from task boxes, estimating completion time using AI, and finding optimal Google Calendar slots based on availability and peak cognitive performance.

## Features

✅ **Content Extraction** - Extracts text content from task boxes
🤖 **AI-Powered Time Estimation** - Uses Google's Gemini API to estimate task completion time
🎯 **Optimal Slot Finder** - Identifies best calendar slots based on:
- Available gaps in your Google Calendar
- Peak cognitive performance times (morning focus, afternoon productivity)
- Task complexity and estimated duration

🔄 **Google Calendar Sync** - Creates calendar events at optimal times
✅ **Mark as Done** - Archives completed tasks and auto-deletes calendar events
📦 **Archive System** - Keeps track of completed tasks

## Files

- **test.html** - Standalone test page with a task box UI
- **content-extractor.js** - Browser script implementing all functionality
- **CONTENT_EXTRACTOR_README.md** - This documentation

## Quick Start

### 1. Open the Test Page

Open `test.html` in your browser:

```bash
# From the project directory
open test.html
# OR
firefox test.html
# OR simply drag and drop into your browser
```

### 2. Configure API Keys

You need at least a Gemini API key for AI-powered time estimation:

1. **Gemini API Key** (Required for AI features):
   - Get your free key at: https://aistudio.google.com/app/apikey
   - Paste into the "Gemini API Key" field
   - API key will be saved in localStorage

2. **Google Calendar API Key** (Optional for full calendar integration):
   - Set up OAuth2 credentials at: https://console.cloud.google.com/
   - Note: Without this, the script will use calendar link fallback (still works!)

### 3. Use the Tool

1. **Enter a task** in the task box (or use the pre-filled example)
2. **Click "Analyze"** to get AI-powered time estimate
3. **Click "Find Optimal Slot"** to identify the best calendar time
4. **Click "Sync to Calendar"** to create the calendar event
5. **Click "Mark as Done"** when complete to archive and clean up

## How It Works

### Content Extraction

The script extracts content from the task textarea element:

```javascript
window.TaskExtractor.extractContent();
```

### AI Time Estimation

Uses Google's Gemini Pro model to analyze task complexity and estimate completion time:

```javascript
await window.TaskExtractor.analyzeTask();
```

The AI considers:
- Task description and scope
- Implied research/execution/review time
- Realistic completion estimates

### Optimal Slot Finder

Finds the best time to schedule based on:

**Cognitive Performance Scores:**
- Morning (9-12): 100% - Best for complex tasks
- Early Afternoon (2-4 PM): 80% - Good for moderate tasks
- Late Afternoon (4-6 PM): 60% - Decent for lighter tasks
- Evening (6-9 PM): 40% - Acceptable but not ideal

**Algorithm:**
1. Fetches calendar events for next 7 days (if API key provided)
2. Identifies gaps between existing events
3. Calculates cognitive score for each potential slot
4. Prioritizes earlier days (slight preference)
5. Returns highest-scoring available slot

```javascript
await window.TaskExtractor.findOptimalSlot();
```

### Google Calendar Sync

Two modes:

**With API Key (Full Integration):**
- Automatically creates event via Calendar API
- Returns event ID for later deletion
- Sets reminders

**Without API Key (Link Fallback):**
- Opens calendar.google.com with pre-filled event
- User clicks "Save" to add event
- Still fully functional!

```javascript
await window.TaskExtractor.syncToCalendar();
```

### Mark as Done

When marking a task complete:
1. Deletes the calendar event (if event ID exists)
2. Archives task to localStorage
3. Displays in archive section
4. Clears the task box for next task

```javascript
await window.TaskExtractor.markAsDone();
```

## Browser Console Usage

You can also use the script programmatically from the browser console:

```javascript
// Extract content
const content = window.TaskExtractor.extractContent();

// Analyze with AI
await window.TaskExtractor.analyzeTask();

// Find optimal slot
await window.TaskExtractor.findOptimalSlot();

// Sync to calendar
await window.TaskExtractor.syncToCalendar();

// Mark as done
await window.TaskExtractor.markAsDone();

// Access current task data
console.log(window.TaskExtractor);
```

## Architecture

### Peak Cognitive Performance

The script uses research-backed cognitive performance patterns:

```javascript
const PEAK_HOURS = {
    morning: { start: 9, end: 12, score: 1.0 },      // Peak focus
    earlyAfternoon: { start: 14, end: 16, score: 0.8 }, // Good productivity
    lateAfternoon: { start: 16, end: 18, score: 0.6 },  // Moderate energy
    evening: { start: 18, end: 21, score: 0.4 }         // Low priority
};
```

### Data Storage

- **localStorage** - Stores API keys and archived tasks
- **Session data** - Current task analysis in memory
- **Archive** - Persisted history of completed tasks

### API Integration

**Gemini API (AI Estimation):**
```
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent
```

**Google Calendar API (Event Management):**
```
GET  https://www.googleapis.com/calendar/v3/calendars/primary/events
POST https://www.googleapis.com/calendar/v3/calendars/primary/events
DELETE https://www.googleapis.com/calendar/v3/calendars/primary/events/{eventId}
```

## Example Workflow

1. **User enters task:** "Write a research paper on climate change"

2. **AI Analysis:**
   - Estimated time: 4 hrs
   - Complexity: hard
   - Reasoning: "Requires research, writing, citations, and review"

3. **Optimal Slot Finder:**
   - Scans next 7 days
   - Finds: Tomorrow, 9:00 AM - 1:00 PM
   - Cognitive Score: 100%
   - Reason: "Peak morning focus"

4. **Sync to Calendar:**
   - Creates event: "Task: Write a research paper on..."
   - Time: Tomorrow 9-1 PM
   - Reminder: 30 minutes before

5. **Mark as Done:**
   - Deletes calendar event
   - Archives task with completion timestamp
   - Clears task box for next item

## Limitations & Notes

### Google Calendar API
- Full API integration requires OAuth2 authentication
- Current implementation uses API key (simplified for demo)
- Fallback to calendar links works without OAuth2
- For production use, implement proper OAuth2 flow

### API Keys Security
- Currently stored in localStorage (browser-only)
- Never commit API keys to repositories
- For production, use secure key management
- Consider using environment variables or key vaults

### Browser Compatibility
- Tested on modern browsers (Chrome, Firefox, Safari, Edge)
- Requires JavaScript enabled
- Uses ES6+ features (arrow functions, async/await, etc.)

## Troubleshooting

**"Please enter a Gemini API key first"**
- Get a free key at https://aistudio.google.com/app/apikey
- Paste into the API key field
- Key is saved automatically to localStorage

**"Calendar API request failed"**
- Google Calendar API requires OAuth2 for production
- Script will fallback to opening a calendar link
- Click "Save" in the opened calendar tab

**"No task to mark as done"**
- Make sure you've entered task content
- Extract content first before marking done

**Task not appearing in archive**
- Check browser console for errors
- Verify localStorage is enabled
- Try refreshing the page

## Integration with Main Dashboard

This script can be integrated into the main Homework Dashboard:

1. Import `content-extractor.js` into `index.html`
2. Use `window.TaskExtractor` methods in existing task card handlers
3. Replace `scheduleTask()` function with optimal slot finder
4. Enhance `markTaskDone()` with calendar event deletion

Example integration:
```javascript
// In scripts.js
async function scheduleTask(noteType, cardId, timeframe) {
    const card = taskCards[noteType].find(c => c.id === cardId);
    if (!card) return;

    // Use content extractor
    window.TaskExtractor.currentTask.content = card.content;
    window.TaskExtractor.currentTask.estimatedMinutes = card.rating?.rawMinutes;

    await window.TaskExtractor.findOptimalSlot();
    await window.TaskExtractor.syncToCalendar();
}
```

## Future Enhancements

- [ ] Full OAuth2 implementation for Google Calendar
- [ ] Support for multiple calendar accounts
- [ ] Machine learning for personalized cognitive patterns
- [ ] Integration with productivity tracking
- [ ] Export functionality (JSON, CSV)
- [ ] Recurring task support
- [ ] Priority-based scheduling
- [ ] Team collaboration features

## License

Part of the Homework Dashboard project.

## Support

For issues or questions:
1. Check this README
2. Review browser console for error messages
3. Verify API keys are valid and active
4. Open an issue on the GitHub repository
