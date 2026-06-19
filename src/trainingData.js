export const PASSING_SCORE = 85;

export const statusSteps = [
  ['pending_review', 'Application submitted'],
  ['accepted', 'Admin accepted'],
  ['onboarding', 'Onboarding unlocked'],
  ['testing', 'Final test'],
  ['active_salesman', 'Dashboard unlocked']
];

export const onboardingSections = [
  {
    id: 'what-reimage-sells',
    title: 'What RE IMAGE Sells',
    body: 'RE IMAGE modernizes small businesses with websites, client portals, admin portals, QR systems, invoice systems, booking workflows, AI receptionists, automations, and custom business software. The sales job is to diagnose redundant work and show owners a cleaner operating system.'
  },
  {
    id: 'explain-reimage',
    title: 'How To Explain RE IMAGE',
    body: 'Use plain language: RE IMAGE helps businesses look modern, get customers, manage customers, and reduce manual follow-up. Lead with outcomes, then match the owner to the right system.'
  },
  {
    id: 'packages',
    title: 'Websites, Portals, And Packages',
    body: 'Sell the business result first: better trust, faster booking, cleaner lead capture, and easier customer management. Packages can include static websites, dynamic portals, admin dashboards, QR tools, invoice flows, and automations.'
  },
  {
    id: 'automation-systems',
    title: 'Automations And Workflows',
    body: 'Automations remove repetitive work: lead routing, confirmations, reminders, intake forms, status updates, invoice follow-up, and internal notifications. Never promise a custom automation without admin approval.'
  },
  {
    id: 'qr-invoice-booking',
    title: 'QR, Invoice, And Booking Requests',
    body: 'Collect exact client details before submitting requests. For QR codes, confirm destination URL, label, purpose, and due date. For invoices, confirm client contact, service, price, deposit, due date, notes, and special terms.'
  },
  {
    id: 'objections',
    title: 'Objections And Responses',
    body: 'For price objections, return to lost leads and wasted time. For timing objections, offer a simple next step. For trust objections, show examples and explain process. Do not pressure. Clarify, educate, and move to the next commitment.'
  },
  {
    id: 'ethics',
    title: 'Sales Ethics And Rules',
    body: 'No false promises, fake deadlines, guaranteed results, fake discounts, or invented capabilities. Be honest about approval, pricing, timelines, and scope. Admin approval is required before promising custom work, discounts, financing terms, or delivery dates.'
  },
  {
    id: 'commission',
    title: 'Commission Structure',
    body: 'Sales representatives earn 20 percent commission on approved closed-won deals unless admin marks a different approved rate. Commission status and payout status are controlled by admin.'
  },
  {
    id: 'lead-notes',
    title: 'Lead Notes And Follow-Ups',
    body: 'Useful notes include pain points, decision maker, budget signals, service interest, next action, objections, timeline, and follow-up date. Notes must be professional because admin can read them.'
  }
];

export const testQuestions = [
  {
    id: 'q1',
    question: 'When does a salesman unlock the dashboard?',
    options: ['After applying', 'After admin acceptance, onboarding completion, and passing the test', 'After creating an account', 'After one lead note'],
    answer: 'After admin acceptance, onboarding completion, and passing the test'
  },
  {
    id: 'q2',
    question: 'What is the standard commission rate shown to salesmen?',
    options: ['5 percent', '10 percent', '20 percent', '50 percent'],
    answer: '20 percent'
  },
  {
    id: 'q3',
    question: 'What should a salesman do before promising custom automation work?',
    options: ['Promise it immediately', 'Ask admin for approval', 'Quote any price', 'Skip notes'],
    answer: 'Ask admin for approval'
  },
  {
    id: 'q4',
    question: 'Which details belong in an invoice request?',
    options: ['Only client name', 'Service, price, contact details, due date, terms, and notes', 'Only salesman notes', 'Only QR label'],
    answer: 'Service, price, contact details, due date, terms, and notes'
  },
  {
    id: 'q5',
    question: 'How should RE IMAGE be explained to business owners?',
    options: ['As random marketing help', 'As systems that modernize operations, capture leads, and reduce redundant work', 'As a guaranteed sales machine', 'As only logo design'],
    answer: 'As systems that modernize operations, capture leads, and reduce redundant work'
  },
  {
    id: 'q6',
    question: 'What should lead notes include?',
    options: ['Pain points, decision maker, next action, service interest, and follow-up date', 'Private jokes', 'Nothing after calls', 'Only the city'],
    answer: 'Pain points, decision maker, next action, service interest, and follow-up date'
  },
  {
    id: 'q7',
    question: 'What is the correct response to price objections?',
    options: ['Argue with the owner', 'Return to lost leads, wasted time, and business value', 'Drop the price without approval', 'End the conversation'],
    answer: 'Return to lost leads, wasted time, and business value'
  },
  {
    id: 'q8',
    question: 'Who controls commission payout status?',
    options: ['Admin', 'The client', 'The browser', 'Anyone viewing the site'],
    answer: 'Admin'
  },
  {
    id: 'q9',
    question: 'What should a QR request include?',
    options: ['Destination URL, purpose, preferred label, due date, and notes', 'Only a color', 'Only the client phone', 'No destination URL'],
    answer: 'Destination URL, purpose, preferred label, due date, and notes'
  },
  {
    id: 'q10',
    question: 'What should salesmen avoid promising without approval?',
    options: ['Custom scope, discounts, timelines, financing terms, or guaranteed results', 'A follow-up call', 'Taking notes', 'Sending an application'],
    answer: 'Custom scope, discounts, timelines, financing terms, or guaranteed results'
  }
];

export const resourceFiles = [
  ['Full Sales Playbook', '/REIMAGE_Full_Sales_Playbook.pdf'],
  ['Lead Sources Playbook', '/REIMAGE_Lead_Sources_Playbook.pdf'],
  ['Master Onboarding Book', '/REIMAGE_Master_Onboarding_Book_Expanded.pdf'],
  ['Onboarding Test', '/REIMAGE_Onboarding_Test.pdf'],
  ['Sales Poster', '/REIMAGE_Sales_Poster.pdf'],
  ['Sales Study Guide', '/REIMAGE_Sales_Study_Guide.pdf']
];
