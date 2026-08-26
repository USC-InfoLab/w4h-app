export const ADMIN_NEXT_STEPS_KEY = 'w4h.adminNextSteps';
export const USER_NEXT_STEPS_KEY = 'w4h.userNextSteps';

export const adminNextStepCards = [
  {
    title: '1. Create a project',
    text: 'Workspace for members, linked datasets, and project pages.',
    to: { name: 'adminProjectsAdd' },
    label: 'Add project',
  },
  {
    title: '2. Contributions & datasets',
    text: 'Link datasets on the project. Load tables by adapting a notebook or CLI from a Contributions example. Sample datasets on a demonstration project are read-only.',
    to: { name: 'contributions' },
    label: 'Open Contributions',
  },
  {
    title: '3. Invite members',
    text: 'Invite and manage collaborators from Project → People.',
    to: { name: 'adminProjects' },
    label: 'Open project',
  },
  {
    title: '4. AI Chat',
    text: 'If the chat icon is in the nav, use it to setup questions or chat with the AI. It works when a team or platform key is configured.',
    to: { name: 'docs', params: { slug: 'welcome-admin' } },
    label: 'Open Admin guide',
  },
];

export const userNextStepCards = [
  {
    title: '1. Your project',
    text: 'Open Project for study info and which datasets are linked. You cannot add datasets or edit raw tables.',
    to: { name: 'projects' },
    label: 'Open projects',
  },
  {
    title: '2. Loaded data',
    text: 'A dataset is loaded when tables show on the overview. Sample data on a demonstration project is read-only.',
    to: { name: 'projects' },
    label: 'View datasets',
  },
  {
    title: '3. Analytics',
    text: 'Browse Contributions for analysis tools against loaded datasets. Ask an Admin if tables are missing.',
    to: { name: 'contributions' },
    label: 'Open Contributions',
  },
  {
    title: '4. Chat, if available',
    text: 'If the chat icon is in the nav, use it for how-to questions. It only works when chat is configured for the team.',
    to: { name: 'docs', params: { slug: 'welcome-user' } },
    label: 'Open User guide',
  },
];

export function isAdminNextStepsDismissed() {
  return localStorage.getItem(ADMIN_NEXT_STEPS_KEY) === 'dismissed';
}

export function dismissAdminNextSteps() {
  localStorage.setItem(ADMIN_NEXT_STEPS_KEY, 'dismissed');
}

export function isUserNextStepsDismissed() {
  return localStorage.getItem(USER_NEXT_STEPS_KEY) === 'dismissed';
}

export function dismissUserNextSteps() {
  localStorage.setItem(USER_NEXT_STEPS_KEY, 'dismissed');
}
