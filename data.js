// Assign directly to window/global scope to make accessible to scripts.js
window.courseData = {
  "Wednesday, May 13, 2026": {
    "The Family Office|||Due: Wed, May 13 at 8:30 AM": {
      "submit": [
        {
          "title": "Case for Week 8",
          "time": 1.5
        }
      ],
      "reading": [],
      "required": [],
      "optional": []
    }
  },
  "Thursday, May 14, 2026": {
    "Value Creation in Small Businesses|||Due: Thu, May 14 at 6:00 PM": {
      "submit": [
        {
          "title": "KidCare Case Submission",
          "time": 1.5
        }
      ],
      "reading": [],
      "required": [],
      "optional": []
    },
    "Brand Management in a Digital Age|||Due: Thu, May 14 at 5:00 PM": {
      "submit": [
        {
          "title": "Week 8: Glossier: Co-Creating a Cult Brand with a Digital Community",
          "time": 1.5
        }
      ],
      "reading": [],
      "required": [],
      "optional": []
    }
  },
  "Monday, May 18, 2026": {
    "Brand Management in a Digital Age|||Due: Mon, May 18 at 5:00 PM": {
      "submit": [
        {
          "title": "Final Brand Management Project",
          "time": 1
        }
      ],
      "reading": [],
      "required": [],
      "optional": []
    }
  },
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

window.lastUpdated = "2026-05-12T05:04:10.642Z";

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { courseData: window.courseData, courseInfo: window.courseInfo, classEndTimes: window.classEndTimes, lastUpdated: window.lastUpdated };
}
