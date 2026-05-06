// Assign directly to window/global scope to make accessible to scripts.js
window.courseData = {
  "Wednesday, May 6, 2026": {
    "The Family Office|||Due: Wed, May 6 at 8:30 AM": {
      "submit": [
        {
          "title": "Case for Week 7",
          "time": 1.5
        }
      ],
      "reading": [],
      "required": [],
      "optional": []
    }
  },
  "Thursday, May 7, 2026": {
    "Value Creation in Small Businesses|||Due: Thu, May 7 at 6:00 PM": {
      "submit": [
        {
          "title": "Submit Partner Company Call 3 Questions",
          "time": 0.5
        },
        {
          "title": "Week 7: Mission Veterinary Partners Case Submission",
          "time": 1.5
        }
      ],
      "reading": [],
      "required": [],
      "optional": []
    }
  },
  "Monday, May 11, 2026": {
    "Value Creation in Small Businesses|||Due: Mon, May 11 at 6:00 PM": {
      "submit": [
        {
          "title": "Client Project Assignment #3 - Value Creation Readiness Assessment",
          "time": 3
        }
      ],
      "reading": [],
      "required": [],
      "optional": []
    },
    "Brand Management in a Digital Age|||Due: Mon, May 11 at 5:00 PM": {
      "submit": [
        {
          "title": "Week 8: Glossier: Co-Creating a Cult Brand with a Digital Community",
          "time": 1.5
        }
      ],
      "reading": [],
      "required": [],
      "optional": [
        {
          "title": "Optional - Marketing in the Wild - Week 8",
          "time": 0.5
        }
      ]
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
  "Wednesday, May 27, 2026": {
    "Value Creation in Small Businesses|||Due: Wed, May 27 at 6:00 PM": {
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

window.lastUpdated = "2026-05-06T05:03:58.331Z";

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { courseData: window.courseData, courseInfo: window.courseInfo, classEndTimes: window.classEndTimes, lastUpdated: window.lastUpdated };
}
