// Assign directly to window/global scope to make accessible to scripts.js
window.courseData = {
  "Monday, May 25, 2026": {
    "Value Creation in Small Businesses|||Due: Mon, May 25 at 6:00 PM": {
      "submit": [
        {
          "title": "Client Project: Final Assignment",
          "time": 3
        }
      ],
      "reading": [],
      "required": [],
      "optional": []
    }
  }
};

window.courseInfo = {
  "The Family Office": {
    "due": "Next class",
    "syllabusUrl": "https://canvas.uchicago.edu/courses/70209/assignments/syllabus",
    "assignmentsUrl": "https://canvas.uchicago.edu/courses/70209/assignments"
  },
  "Value Creation in Small Businesses": {
    "due": "Next class",
    "syllabusUrl": "https://canvas.uchicago.edu/courses/70224/assignments/syllabus",
    "assignmentsUrl": "https://canvas.uchicago.edu/courses/70224/assignments"
  },
  "Brand Management in a Digital Age": {
    "due": "Next class",
    "syllabusUrl": "https://canvas.uchicago.edu/courses/71422/assignments/syllabus",
    "assignmentsUrl": "https://canvas.uchicago.edu/courses/71422/assignments"
  }
};

window.classEndTimes = {
  "The Family Office": {
    "day": 2,
    "hour": 17,
    "minute": 0
  },
  "Value Creation in Small Businesses": {
    "day": 3,
    "hour": 21,
    "minute": 0
  },
  "Brand Management in a Digital Age": {
    "day": 1,
    "hour": 21,
    "minute": 0
  }
};

window.lastUpdated = "2026-05-19T05:04:49.049Z";

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { courseData: window.courseData, courseInfo: window.courseInfo, classEndTimes: window.classEndTimes, lastUpdated: window.lastUpdated };
}
