const installButton = document.querySelector('#installButton');
const year = document.querySelector('#year');
const caseGrid = document.querySelector('#caseGrid');
const proofSearch = document.querySelector('#proofSearch');
const serviceFilters = document.querySelector('#serviceFilters');
const filterSummary = document.querySelector('#filterSummary');
const transformationResultCount = document.querySelector('#transformationResultCount');
const portfolioFinder = document.querySelector('#portfolioFinder');

let deferredInstallPrompt = null;
let transformationArchive = [];
let enhancementArchive = {};
let searchTerm = '';

const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const normalize = (value = '') => String(value).trim().toLowerCase();
const titleCase = (value = '') => String(value).replace(/[-_]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const initialService = normalize(new URLSearchParams(window.location.search).get('service') || 'all');
let activeFilter = initialService || 'all';

if (year) year.textContent = new Date().getFullYear();

function injectEnhancementStyles() {
  if (document.querySelector('#enhancedPortfolioStyles')) return;
  const style = document.createElement('style');
  style.id = 'enhancedPortfolioStyles';
  style.textContent = `
    .enhanced-presentation {
      padding: 0 1rem 1.2rem;
    }
    .enhanced-presentation-head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: .75rem;
      margin: .15rem 0 .7rem;
    }
    .enhanced-presentation-head strong {
      font-size: .86rem;
      letter-spacing: .08em;
      text-transform: uppercase;
    }
    .enhanced-presentation-head span {
      font-size: .72rem;
      opacity: .72;
    }
    .enhanced-gallery {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: .7rem;
    }
    .enhanced-gallery figure {
      margin: 0;
      position: relative;
      overflow: hidden;
      border-radius: 16px;
      border: 1px solid rgba(210, 179, 95, .26);
      background: rgba(255,255,255,.035);
    }
    .enhanced-gallery img {
      width: 100%;
      aspect-ratio: 3 / 4;
      object-fit: cover;
      display: block;
    }
    .enhanced-gallery figcaption {
      position: absolute;
      left: .55rem;
      bottom: .55rem;
      padding: .3rem .5rem;
      border-radius: 999px;
      background: rgba(15, 12, 15, .76);
      color: #fff;
      font-size: .68rem;
      line-height: 1;
      backdrop-filter: blur(8px);
    }
    .enhanced-presentation-note {
      margin: .65rem 0 0;
      font-size: .72rem;
      line-height: 1.45;
      opacity: .7;
    }
    @media (max-width: 560px) {
      .enhanced-presentation { padding-inline: .8rem; }
      .enhanced-gallery { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .enhanced-presentation-head { align-items: flex-start; flex-direction: column; gap: .2rem; }
    }
  `;
  document.head.appendChild(style);
}

injectEnhancementStyles();

function injectMeetIGlow() {
  const academySection = document.querySelector('#studio-academy');
  const mediaGrid = academySection?.querySelector('.academy-media-grid');
  if (!academySection || !mediaGrid || academySection.querySelector('.meet-iglow-feature')) return;

  const feature = document.createElement('article');
  feature.className = 'meet-iglow-feature';
  feature.innerHTML = `
    <div class="meet-iglow-copy">
      <span class="media-kicker">MEET IGLOW</span>
      <h3>Beauty, confidence &amp; care—under one roof.</h3>
      <p>Meet the professionals behind the I Glow Beauty Bar experience. Team information stays separate from the client transformation portfolio.</p>
      <div class="meet-iglow-values" aria-label="I Glow Beauty Bar highlights">
        <span>Passionate professionals</span>
        <span>Personalized care</span>
        <span>Client-focused experience</span>
      </div>
    </div>
    <div class="meet-iglow-gallery" aria-label="I Glow Beauty Bar team">
      <figure class="meet-iglow-team">
        <img src="https://iglowbeautybar.com/wp-content/uploads/2024/12/staff-iglow-beauty-bar-1024x1024.jpg" width="1024" height="1024" loading="lazy" decoding="async" alt="I Glow Beauty Bar team" />
        <figcaption><strong>Our Team</strong><span>The professionals behind the glow.</span></figcaption>
      </figure>
    </div>`;

  const teamImage = feature.querySelector('img');
  teamImage?.addEventListener('error', () => feature.remove(), { once: true });
  mediaGrid.after(feature);
}

injectMeetIGlow();

async function getJson(path) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${path} failed: ${response.status}`);
  return response.json();
}

function transformationTags(item) {
  const tags = Array.isArray(item.service_tags) ? [...item.service_tags] : [];
  if (item.service) tags.push(item.service);
  return [...new Set(tags.map(normalize).filter(Boolean))];
}

function transformationHaystack(item) {
  return normalize([
    item.title,
    item.service,
    item.customer_label,
    item.caption,
    item.description,
    ...(item.service_tags || [])
  ].filter(Boolean).join(' '));
}

function publishableTransformations() {
  return transformationArchive.filter((item) =>
    item.consent_confirmed === true &&
    item.publication_authorized === true &&
    item.before_image &&
    item.after_image
  );
}

function matchesTransformation(item) {
  const tags = transformationTags(item);
  const filterMatches = activeFilter === 'all' || tags.includes(activeFilter);
  const searchMatches = !searchTerm || transformationHaystack(item).includes(searchTerm);
  return filterMatches && searchMatches;
}

function syncSectionVisibility() {
  const resultsSection = document.querySelector('#results');
  const hasResults = publishableTransformations().length > 0;

  if (resultsSection) resultsSection.hidden = !hasResults;
  if (portfolioFinder) portfolioFinder.hidden = !hasResults;

  document.querySelectorAll('.nav a[href^="#"]').forEach((link) => {
    const target = document.querySelector(link.getAttribute('href'));
    link.hidden = !target || target.hidden;
  });
}

function syncFilterUrl() {
  const url = new URL(window.location.href);
  if (activeFilter === 'all') url.searchParams.delete('service');
  else url.searchParams.set('service', activeFilter);
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

function setActiveFilter(filter, { scroll = false, syncUrl = true } = {}) {
  activeFilter = normalize(filter || 'all') || 'all';
  if (syncUrl) syncFilterUrl();
  renderPortfolio();
  if (scroll && portfolioFinder && !portfolioFinder.hidden) {
    portfolioFinder.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
  }
}

function buildFilterChips() {
  if (!serviceFilters) return;
  const tags = new Set();
  publishableTransformations().forEach((item) => transformationTags(item).forEach((tag) => tags.add(tag)));

  const chips = ['all', ...Array.from(tags).sort((a, b) => a.localeCompare(b))];
  if (!chips.includes(activeFilter)) activeFilter = 'all';

  serviceFilters.innerHTML = chips.map((tag) => {
    const active = tag === activeFilter;
    const label = tag === 'all' ? 'All transformations' : titleCase(tag);
    return `<button class="filter-chip${active ? ' is-active' : ''}" type="button" data-filter="${escapeHtml(tag)}" aria-pressed="${active}">${escapeHtml(label)}</button>`;
  }).join('');
}

function sourceDimensions(item) {
  const match = String(item.source_resolution || '').match(/^(\d+)[xX](\d+)$/);
  return match ? { width: match[1], height: match[2] } : null;
}

function comparisonMarkup(item, priority = false) {
  const title = item.title || 'Client result';
  const beforeAlt = item.before_alt || `Before ${title}`;
  const afterAlt = item.after_alt || `After ${title}`;
  const dimensions = sourceDimensions(item);
  const sizeAttrs = dimensions ? ` width="${dimensions.width}" height="${dimensions.height}"` : '';
  const loading = priority ? 'eager' : 'lazy';
  const fetchPriority = priority ? ' fetchpriority="high"' : '';

  return `<div class="comparison-slider" data-comparison style="--split:50%">
    <img class="comparison-image comparison-before" src="${escapeHtml(item.before_image)}" alt="${escapeHtml(beforeAlt)}"${sizeAttrs} loading="${loading}" decoding="async"${fetchPriority} />
    <img class="comparison-image comparison-after" src="${escapeHtml(item.after_image)}" alt="${escapeHtml(afterAlt)}"${sizeAttrs} loading="${loading}" decoding="async"${fetchPriority} />
    <span class="comparison-label comparison-label-before">Before</span>
    <span class="comparison-label comparison-label-after">After</span>
    <span class="comparison-handle" aria-hidden="true"><span>↔</span></span>
    <input class="comparison-range" type="range" min="0" max="100" value="50" aria-label="Compare before and after for ${escapeHtml(title)}" />
  </div>`;
}

function enhancedPresentationMarkup(item) {
  const enhanced = enhancementArchive[item.id];
  const images = Array.isArray(enhanced?.images) ? enhanced.images.filter((entry) => entry?.image) : [];
  if (!images.length) return '';

  const gallery = images.map((entry) => `
    <figure>
      <img src="${escapeHtml(entry.image)}" alt="${escapeHtml(entry.alt || `${item.title || 'Client result'} enhanced presentation view`)}" width="1086" height="1448" loading="lazy" decoding="async" />
      <figcaption>${escapeHtml(entry.label || 'Enhanced view')}</figcaption>
    </figure>`).join('');

  return `<section class="enhanced-presentation" aria-label="Enhanced presentation views for ${escapeHtml(item.title || 'client result')}">
    <div class="enhanced-presentation-head">
      <strong>Enhanced Views</strong>
      <span>Clean background · HDR presentation</span>
    </div>
    <div class="enhanced-gallery">${gallery}</div>
    ${enhanced.presentation_note ? `<p class="enhanced-presentation-note">${escapeHtml(enhanced.presentation_note)}</p>` : ''}
  </section>`;
}

function renderTransformations() {
  if (!caseGrid) return;
  const visibleItems = publishableTransformations().filter(matchesTransformation);
  if (transformationResultCount) transformationResultCount.textContent = visibleItems.length;

  if (!visibleItems.length) {
    caseGrid.innerHTML = '<article class="case-card loading-card"><p>No published before-and-after results match this filter yet.</p></article>';
    return;
  }

  caseGrid.innerHTML = visibleItems.map((item, index) => {
    const tags = transformationTags(item).map((tag) => `<span>${escapeHtml(titleCase(tag))}</span>`).join('');
    return `<article class="case-card">
      ${comparisonMarkup(item, index === 0)}
      <div class="case-copy">
        <div class="case-tags">${tags}</div>
        <h3>${escapeHtml(item.title || 'Client result')}</h3>
        <p>${escapeHtml(item.caption || '')}</p>
        <span class="status-pill">High-resolution client result</span>
      </div>
      ${enhancedPresentationMarkup(item)}
    </article>`;
  }).join('');
}

function updateFilterSummary() {
  if (!filterSummary) return;
  const parts = [];
  if (activeFilter !== 'all') parts.push(titleCase(activeFilter));
  if (searchTerm) parts.push(`“${searchTerm}”`);
  filterSummary.textContent = parts.length
    ? `Filtering transformations by ${parts.join(' and ')}.`
    : 'Showing the complete before-and-after portfolio.';
}

function renderPortfolio() {
  buildFilterChips();
  renderTransformations();
  updateFilterSummary();
  syncSectionVisibility();
}

async function loadPortfolio() {
  try {
    const [transformationData, enhancementData] = await Promise.all([
      getJson('./data/transformations.json'),
      getJson('./data/enhanced-transformations.json').catch(() => ({ enhanced_transformations: {} }))
    ]);
    transformationArchive = Array.isArray(transformationData.transformations) ? transformationData.transformations : [];
    enhancementArchive = enhancementData?.enhanced_transformations || {};
    renderPortfolio();
  } catch (error) {
    console.warn(error);
    document.querySelector('#results')?.setAttribute('hidden', '');
    portfolioFinder?.setAttribute('hidden', '');
    syncSectionVisibility();
  }
}

serviceFilters?.addEventListener('click', (event) => {
  const button = event.target.closest('[data-filter]');
  if (!button) return;
  setActiveFilter(button.dataset.filter || 'all');
});

proofSearch?.addEventListener('input', (event) => {
  searchTerm = normalize(event.target.value);
  renderPortfolio();
});

caseGrid?.addEventListener('input', (event) => {
  const range = event.target.closest('.comparison-range');
  if (!range) return;
  const slider = range.closest('[data-comparison]');
  slider?.style.setProperty('--split', `${range.value}%`);
});

loadPortfolio();

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  if (installButton) installButton.hidden = false;
});

installButton?.addEventListener('click', async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  installButton.hidden = true;
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  if (installButton) installButton.hidden = true;
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      await navigator.serviceWorker.register('./sw.js');
    } catch (error) {
      console.warn('Service worker registration failed:', error);
    }
  });
}
