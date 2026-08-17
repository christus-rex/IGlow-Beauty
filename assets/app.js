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

function publishedDimensions(item) {
  const declared = item.published_resolution || item.source_resolution || '';
  const match = String(declared).match(/^(\d+)[xX](\d+)$/);
  return match ? { width: match[1], height: match[2] } : null;
}

function comparisonMarkup(item, priority = false) {
  const title = item.title || 'Client result';
  const beforeAlt = item.before_alt || `Before ${title}`;
  const afterAlt = item.after_alt || `After ${title}`;
  const dimensions = publishedDimensions(item);
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

function showcaseVideoPath(item) {
  const id = String(item.id || '').trim().toLowerCase();
  return id ? `./assets/videos/${id}.mp4` : '';
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
    const status = item.presentation_standard ? 'Standardized high-resolution presentation' : 'High-resolution client result';
    const videoPath = showcaseVideoPath(item);
    const title = item.title || 'Client result';
    const videoMarkup = videoPath
      ? `<div class="hero-actions">
          <a class="button button-secondary" href="${escapeHtml(videoPath)}" download aria-label="Download 20-second before and after MP4 slideshow for ${escapeHtml(title)}">Download 20s MP4</a>
        </div>
        <p><small>10 seconds Before · 10 seconds After · service title subtly overlaid</small></p>`
      : '';

    return `<article class="case-card">
      ${comparisonMarkup(item, index === 0)}
      <div class="case-copy">
        <div class="case-tags">${tags}</div>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(item.caption || '')}</p>
        <span class="status-pill">${escapeHtml(status)}</span>
        ${videoMarkup}
      </div>
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
    const transformationData = await getJson('./data/transformations.json');
    transformationArchive = Array.isArray(transformationData.transformations) ? transformationData.transformations : [];
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
      const registration = await navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' });
      registration.update().catch(() => {});
    } catch (error) {
      console.warn('Service worker registration failed:', error);
    }
  });
}
