import { sub } from 'date-fns'

const notifications = [{
  id: 1,
  unread: true,
  sender: {
    name: 'Google',
    avatar: {
      src: 'https://i.pravatar.cc/128?u=2'
    }
  },
  body: 'Application status updated to "Interview"',
  date: sub(new Date(), { minutes: 7 }).toISOString()
}, {
  id: 2,
  sender: {
    name: 'Resume Parser'
  },
  body: 'Successfully parsed your new resume "Senior Developer 2023"',
  date: sub(new Date(), { hours: 1 }).toISOString()
}, {
  id: 3,
  unread: true,
  sender: {
    name: 'Microsoft',
    avatar: {
      src: 'https://i.pravatar.cc/128?u=3'
    }
  },
  body: 'New application submitted for "Full Stack Developer"',
  date: sub(new Date(), { hours: 3 }).toISOString()
}, {
  id: 4,
  sender: {
    name: 'Resume Generator',
    avatar: {
      src: 'https://i.pravatar.cc/128?u=4'
    }
  },
  body: 'Custom resume created for Amazon application',
  date: sub(new Date(), { hours: 3 }).toISOString()
}, {
  id: 5,
  sender: {
    name: 'Apple',
    avatar: {
      src: 'https://i.pravatar.cc/128?u=5'
    }
  },
  body: 'Application status updated to "Rejected"',
  date: sub(new Date(), { hours: 7 }).toISOString()
}, {
  id: 6,
  sender: {
    name: 'LinkedIn',
    avatar: {
      src: 'https://i.pravatar.cc/128?u=6'
    }
  },
  body: 'New job match found: "Senior Developer at Netflix"',
  date: sub(new Date(), { days: 1, hours: 3 }).toISOString()
}, {
  id: 7,
  unread: true,
  sender: {
    name: 'Facebook',
    avatar: {
      src: 'https://i.pravatar.cc/128?u=8'
    }
  },
  body: 'Application status updated to "Offer"',
  date: sub(new Date(), { days: 2 }).toISOString()
}, {
  id: 8,
  sender: {
    name: 'Resume Analyzer',
    avatar: {
      src: 'https://i.pravatar.cc/128?u=9'
    }
  },
  body: 'Resume optimization suggestions available',
  date: sub(new Date(), { days: 5, hours: 4 }).toISOString()
}, {
  id: 9,
  unread: true,
  sender: {
    name: 'Twitter'
  },
  body: 'New application submitted for "Backend Engineer"',
  date: sub(new Date(), { days: 6 }).toISOString()
}, {
  id: 10,
  sender: {
    name: 'Resume Tracker'
  },
  body: 'You have 5 active applications in progress',
  date: sub(new Date(), { days: 6 }).toISOString()
}, {
  id: 11,
  sender: {
    name: 'Airbnb'
  },
  body: 'Application status updated to "Technical Interview"',
  date: sub(new Date(), { days: 7 }).toISOString()
}, {
  id: 12,
  sender: {
    name: 'Resume Generator'
  },
  body: 'Custom resume created for Microsoft application',
  date: sub(new Date(), { days: 9 }).toISOString()
}, {
  id: 13,
  sender: {
    name: 'Uber',
    avatar: {
      src: 'https://i.pravatar.cc/128?u=8'
    }
  },
  body: 'New application submitted for "Mobile Developer"',
  date: sub(new Date(), { days: 10 }).toISOString()
}, {
  id: 14,
  sender: {
    name: 'Resume Parser',
    avatar: {
      src: 'https://i.pravatar.cc/128?u=9'
    }
  },
  body: 'Successfully parsed your new resume "Junior Developer 2023"',
  date: sub(new Date(), { days: 11 }).toISOString()
}, {
  id: 15,
  sender: {
    name: 'Dropbox'
  },
  body: 'Application status updated to "Phone Screen"',
  date: sub(new Date(), { days: 12 }).toISOString()
}, {
  id: 16,
  sender: {
    name: 'Resume Analyzer',
    avatar: {
      src: 'https://i.pravatar.cc/128?u=16'
    }
  },
  body: 'Keyword analysis completed for your default resume',
  date: sub(new Date(), { days: 13 }).toISOString()
}, {
  id: 17,
  sender: {
    name: 'Slack'
  },
  body: 'New application submitted for "DevOps Engineer"',
  date: sub(new Date(), { days: 14 }).toISOString()
}, {
  id: 18,
  sender: {
    name: 'Resume Generator'
  },
  body: 'Custom resume created for Google application',
  date: sub(new Date(), { days: 15 }).toISOString()
}, {
  id: 19,
  sender: {
    name: 'Spotify',
    avatar: {
      src: 'https://i.pravatar.cc/128?u=8'
    }
  },
  body: 'Application status updated to "Final Interview"',
  date: sub(new Date(), { days: 16 }).toISOString()
}, {
  id: 20,
  sender: {
    name: 'Resume Tracker',
    avatar: {
      src: 'https://i.pravatar.cc/128?u=9'
    }
  },
  body: 'Weekly application summary: 3 new, 2 updated',
  date: sub(new Date(), { days: 17 }).toISOString()
}, {
  id: 21,
  sender: {
    name: 'Adobe'
  },
  body: 'New application submitted for "UI/UX Developer"',
  date: sub(new Date(), { days: 17 }).toISOString()
}, {
  id: 22,
  sender: {
    name: 'Resume Parser'
  },
  body: 'Successfully parsed your new resume "Tech Lead 2023"',
  date: sub(new Date(), { days: 18 }).toISOString()
}, {
  id: 23,
  sender: {
    name: 'Salesforce'
  },
  body: 'Application status updated to "Rejected"',
  date: sub(new Date(), { days: 19 }).toISOString()
}, {
  id: 24,
  sender: {
    name: 'Resume Generator',
    avatar: {
      src: 'https://i.pravatar.cc/128?u=24'
    }
  },
  body: 'Custom resume created for Facebook application',
  date: sub(new Date(), { days: 20 }).toISOString()
}, {
  id: 25,
  sender: {
    name: 'IBM',
    avatar: {
      src: 'https://i.pravatar.cc/128?u=8'
    }
  },
  body: 'New application submitted for "Cloud Engineer"',
  date: sub(new Date(), { days: 20 }).toISOString()
}, {
  id: 26,
  sender: {
    name: 'Resume Analyzer',
    avatar: {
      src: 'https://i.pravatar.cc/128?u=9'
    }
  },
  body: 'ATS compatibility check completed for your resume',
  date: sub(new Date(), { days: 21 }).toISOString()
}, {
  id: 27,
  sender: {
    name: 'Oracle'
  },
  body: 'Application status updated to "On Hold"',
  date: sub(new Date(), { days: 22 }).toISOString()
}]

export default eventHandler(async () => {
  return notifications
})
