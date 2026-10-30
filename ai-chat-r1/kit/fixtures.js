// Shared data for every variant. Tool names are the real MCP tools the chat
// will call (the same actions as /mcp); `result` fields follow their answers.
window.KIT_FIXTURES = {
  owner: { name: 'Alex Morgan', initials: 'AM', company: 'Northbeam', plan: 'Free', livePages: { used: 2, limit: 3 } },
  prospect: { name: 'Anna Lind', company: 'Acme', email: 'anna@example.com' },
  video: { id: 'vid_8f2c', title: 'Acme demo recap', duration: '2:14', recorded: 'Today, 10:42', words: 412 },
  page: {
    id: 'pg_41d9',
    name: 'Acme follow-up',
    title: 'Anna, here is your Acme demo recap',
    titleEdited: 'Anna, three numbers from today, and one next step',
    cta: 'Book a call',
    pricing: {
      title: 'Pricing at a glance',
      body: ['You asked how seats scale. Every plan includes unlimited viewers, and you only pay for the people who record.', 'Most teams your size start on Team and move to Business when they add a second region.'],
      plans: [{ name: 'Starter', price: '$29 / seat' }, { name: 'Team', price: '$49 / seat' }, { name: 'Business', price: 'Custom' }],
    },
    faqTitle: 'Questions from the call',
    faq: ['Can we keep our own domain?', 'Does it work with Salesforce?', 'What happens to videos if we cancel?'],
    faqAdded: 'How long does onboarding take?',
    url: 'clarity.video/p/acme-follow-up',
  },
  library: [
    { kind: 'video', title: 'Acme demo recap', meta: '2:14 · Today' },
    { kind: 'video', title: 'Northwind discovery call', meta: '6:02 · Yesterday' },
    { kind: 'video', title: 'Q4 pricing walkthrough', meta: '3:48 · Oct 24' },
    { kind: 'page', title: 'Globex onboarding', meta: 'Live · Oct 22' },
  ],
  attachments: [{ kind: 'text', label: 'Pasted text', detail: 'Call notes, 1,240 characters' }],

  // One conversation per board screen. Steps are tool calls; `result` is what
  // the tool answered, trimmed. Variants decide how much of it to show.
  conversation: {
    empty: { page: 'blank', messages: [], suggestions: ['Follow-up page', 'Client proposal', 'Prospect journey'] },

    working: {
      page: 'blank',
      messages: [
        { role: 'user', text: "Follow-up for Anna at Acme after today's demo. Use my latest video, recap pricing and ask her to book a call.", attachments: [{ kind: 'text', label: 'Pasted text', detail: 'Call notes, 1,240 characters' }] },
        { role: 'assistant', streaming: true, text: '', steps: [
          { tool: 'library_list', status: 'done', seconds: 0.6, detail: 'Latest video: Acme demo recap, 2:14, today', result: { items: [{ id: 'vid_8f2c', kind: 'video', name: 'Acme demo recap', duration: 134, createdAt: '2026-10-30T10:42:00Z' }] } },
          { tool: 'videos_transcript', status: 'done', seconds: 0.9, detail: '412 words', result: { videoId: 'vid_8f2c', words: 412, language: 'en' } },
          { tool: 'pages_generate', status: 'running', seconds: 7, detail: 'Hero, video, pricing, questions from the call', result: { generation: { status: 'running', step: 'Writing sections' } } },
        ] },
      ],
    },

    review: {
      page: 'edited',
      messages: [
        { role: 'user', text: "Follow-up for Anna at Acme after today's demo. Use my latest video, recap pricing and ask her to book a call.", attachments: [{ kind: 'text', label: 'Pasted text', detail: 'Call notes, 1,240 characters' }] },
        { role: 'assistant', text: 'I wrote the page around your Acme demo recap. It opens with the video, recaps the three plans you discussed, answers the questions Anna raised, and ends with a Book a call button.', steps: [
          { tool: 'library_list', status: 'done', seconds: 0.6, detail: 'Latest video: Acme demo recap' },
          { tool: 'videos_transcript', status: 'done', seconds: 0.9, detail: '412 words' },
          { tool: 'pages_generate', status: 'done', seconds: 14.2, detail: '5 sections' },
        ], changes: [{ block: 'title', label: 'Title' }, { block: 'video', label: 'Video' }, { block: 'cta', label: 'Book a call button' }, { block: 'pricing', label: 'Pricing at a glance' }, { block: 'faq', label: 'Questions from the call' }] },
        { role: 'user', text: 'Make the headline punchier and add a question about onboarding time.' },
        { role: 'assistant', text: 'Done. The headline now leads with the numbers from the call, and onboarding is the last question. It takes two weeks for teams under 50, which is what you told Anna.', steps: [
          { tool: 'pages_get', status: 'done', seconds: 0.4, detail: 'Draft revision 3' },
          { tool: 'pages_edit', status: 'done', seconds: 0.7, detail: '2 changes', result: { revision: 4, changed: ['hero.title', 'faq.items[+1]'] } },
        ], changes: [{ block: 'title', label: 'Title', before: 'Anna, here is your Acme demo recap', after: 'Anna, three numbers from today, and one next step' }, { block: 'faq-added', label: 'Question added', after: 'How long does onboarding take?' }], undo: true },
      ],
    },

    approve: {
      page: 'edited',
      messages: [
        { role: 'user', text: 'Make the headline punchier and add a question about onboarding time.' },
        { role: 'assistant', text: 'Done. The headline now leads with the numbers from the call, and onboarding is the last question.', steps: [
          { tool: 'pages_edit', status: 'done', seconds: 0.7, detail: '2 changes' },
        ], changes: [{ block: 'title', label: 'Title' }, { block: 'faq-added', label: 'Question added' }] },
        { role: 'user', text: 'Publish it and give me the link.' },
        { role: 'assistant', text: '', approval: {
          tool: 'pages_publish', title: 'Publish Acme follow-up?', summary: 'Anyone with the link sees this version.',
          facts: ['Uses 3 of 3 Live pages on Free', 'Link: clarity.video/p/acme-follow-up'],
          state: 'pending',
        }, after: { text: 'Published. Here is the link for Anna.', link: 'clarity.video/p/acme-follow-up' } },
      ],
    },

    home: {
      page: null,
      messages: [
        { role: 'user', text: 'Who opened my pages this week?' },
        { role: 'assistant', text: 'Two prospects opened pages this week. Anna Lind watched most of your Acme video twice and clicked Book a call, so she is the warmest.', steps: [
          { tool: 'pages_stats', status: 'done', seconds: 0.8, detail: '4 live pages' },
          { tool: 'pages_leads', status: 'done', seconds: 0.5, detail: '2 people' },
        ], stats: [
          { page: 'Acme follow-up', views: 6, watched: '82%', lead: 'Anna Lind', action: 'Clicked Book a call', when: 'Today, 14:05' },
          { page: 'Northwind proposal', views: 3, watched: '41%', lead: 'Sam Patel', action: 'Opened 3 times', when: 'Tuesday' },
          { page: 'Globex onboarding', views: 0, watched: '0%', lead: null, action: 'Not opened yet', when: '' },
        ] },
        { role: 'user', text: 'Draft a reply page for Sam that answers the security questions.' },
      ],
    },
  },
};
