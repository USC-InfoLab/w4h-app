import { api, authHeaders } from './api';
import { generateTOC } from './toc';

function getCards(isAdminUI = false) {
  const allCards = [
    {
      card_title: '<span style="font-size: 2em">📊</span> Projects',
      description: '<b>Projects</b> are trial based studies that are organized and managed within the W4H platform.',
      route: isAdminUI ? 'admin/projects' : 'datasets',
      action_label: 'Open Projects'
    },
    {
      card_title: '<span style="font-size: 2em">📚</span> Docs',
      description: '<b>Docs</b> provide guides and reference material for using the W4H Toolkit.',
      route: 'docs',
      hidden: false
    },
  ];

  allCards.forEach(d => d.toc = generateTOC(d.md));

  return isAdminUI
    ? allCards
    : allCards.filter(card => !card.hidden);
}

async function getFeatureCards() {
  try {
    const res = await api.get('/docs/cards/feature', authHeaders());
    return res.data;
  } catch (err) {
    console.error('Error fetching feature cards:', err);
    return [];
  }
}

async function getMarkdownCards(showHidden = false) {
  try {
    const res = await api.get('/docs', {
      ...authHeaders(),
      params: { hidden: showHidden }
    });

    return res.data;
  } catch (err) {
    console.error('Error fetching markdown cards:', err);
    return [];
  }
}

export { getCards, getMarkdownCards, getFeatureCards };
