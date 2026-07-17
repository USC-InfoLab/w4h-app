// cards.js
import { api, authHeaders } from './api';
import { generateTOC } from './toc';

function getCards(isAdminUI = false) {
  const allCards = [
    {
      card_title: '<span style="font-size: 2em">🧪</span> Projects',
      description: '<b>Projects</b> are trial or studies that are organized and managed within the W4H Toolkit platform.',
      route: isAdminUI ? 'admin/projects' : 'projects',
      action_label: 'Open Projects'
    },
    {
      card_title: '<span style="font-size: 2em">👥</span> Teams',
      description: '<b>Teams</b> are research groups that own projects, datasets, and members.',
      route: 'admin/teams',
      action_label: 'Open Teams',
      hidden: !isAdminUI
    },
    {
      card_title: '<span style="font-size: 2em">📚</span> Help',
      description: '<b>Help</b> provide guides and reference material for using the W4H Toolkit.',
      route: 'docs',
      hidden: false
    },
  ];

  allCards.forEach(d => d.toc = generateTOC(d.md));

  return allCards.filter(card => !card.hidden);
}

// Fetch feature cards from dedicated endpoint
async function getFeatureCards() {
  try {
    const res = await api.get('/docs/cards/feature', authHeaders());
    console.log('Feature cards fetched:', res.data);
    return res.data;
  } catch (err) {
    console.error('Error fetching feature cards:', err);
    return [];
  }
}

// New function to fetch dynamic markdown cards from API
async function getMarkdownCards(showHidden = false) {
  try {
    // pass showHidden as query param
    const res = await api.get('/docs', {
      ...authHeaders(),
      params: { hidden: showHidden } // ?hidden=true/false
    });

    // res.data.forEach(d => d.toc = generateTOC(d.md));

    return res.data;
  } catch (err) {
    console.error('Error fetching markdown cards:', err);
    return [];
  }
}

export { getCards, getMarkdownCards, getFeatureCards };