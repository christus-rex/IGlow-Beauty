const installButton = document.querySelector('#installButton');
const year = document.querySelector('#year');
const reviewGrid = document.querySelector('#reviewGrid');
const caseGrid = document.querySelector('#caseGrid');
const heroRating = document.querySelector('#heroRating');
const heroReviewCount = document.querySelector('#heroReviewCount');
const cardRating = document.querySelector('#cardRating');
const cardReviewCount = document.querySelector('#cardReviewCount');
const proofSearch = document.querySelector('#proofSearch');
const serviceFilters = document.querySelector('#serviceFilters');
const filterSummary = document.querySelector('#filterSummary');
const reviewResultCount = document.querySelector('#reviewResultCount');
const transformationResultCount = document.querySelector('#transformationResultCount');

let deferredInstallPrompt = null;
let reviewArchive = [];
let transformationArchive = [];
let activeFilter = 'all';
let searchTerm = '';

if (year) year.textContent = new Date().getFullYear();

const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const normalize = (value = '') => String(value).trim().toLowerCase();
const safeDomId = (value = '') => String(value).replace(/[^a-zA-Z0-9_-]/g, '-');
const titleCase = (value = '') => String(value).replace(/[-_]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

async function getJson(path) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${path} failed: ${response.status}`);
  return response.json();
}

function reviewTags(review) {
  return Array.isArray(review.service_tags) ? review.service_tags.map(normalize).filter(Boolean) : [];
}

function transformationTags(item) {
  const tags = Array.isArray(item.service_tags) ? item.service_tags : [];
  if (item.service) tags.push(item.service);
  return tags.map(normalize).filter(Boolean);
}

function reviewHaystack(review) {
  return normalize([
    review.reviewer,
    review.source,
    review.quote,
    review.summary,
    ...(review.service_tags || [])
  ].filter(Boolean).join(' '));
}

function transformationHaystack(item) {
  return normalize([
    item.title,
    item.service,
    item.customer_label,
    item.caption,
    ...(item.service_tags || [])
  ].filter(Boolean).join(' '));
}

function matchesReview(review) {
  const tags = reviewTags(review);
  const filterMatches = activeFilter === 'all' || tags.includes(activeFilter);
  const searchMatches = !searchTerm || reviewHaystack(review).includes(searchTerm);
  return filterMatches && searchMatches;
}

function matchesTransformation(item) {
  const tags = transformationTags(item);
  const filterMatches = activeFilter === 'all' || tags.includes(activeFilter);
  const searchMatches = !searchTerm || transformationHaystack(item).includes(searchTerm);
  return filterMatches && searchMatches;
}

function buildFilterChips() {
  if (!serviceFilters) return;
  const tags = new Set();
  reviewArchive.forEach((review) => reviewTags(review).forEach((tag) => tags.add(tag)));
  transformationArchive.forEach((item) => transformationTags(item).forEach((tag) => tags.add(tag)));

  const chips = ['all', ...Array.from(tags).sort((a, b) => a.localeCompare(b))];
  serviceFilters.innerHTML = chips.map((tag) => {
    const active = tag === activeFilter;
    const label = tag === 'all' ? 'All proof' : titleCase(tag);
    return `<button class="filter-chip${active ? ' is-active' : ''}" type="button" data-filter="${escapeHtml(tag)}" aria-pressed="${active}">${escapeHtml(label)}</button>`;
  }).join('');
}

function renderReviews() {
  if (!reviewGrid) return;
  const visibleReviews = reviewArchive.filter(matchesReview);
  if (reviewResultCount) reviewResultCount.textContent = visibleReviews.length;

  if (!visibleReviews.length) {
    reviewGrid.innerHTML = '<article class="review-card loading-card"><p>No testimonials match this filter yet.</p></article>';
    return;
  }

  reviewGrid.innerHTML = visibleReviews.map((review) => {
    const stars = '★'.repeat(Math.max(1, Math.min(5, Number(review.rating) || 5)));
    const tags = (review.service_tags || []).map((tag) => `<span>${escapeHtml(titleCase(tag))}</span>`).join('');
    const content = review.quote
      ? `<blockquote>“${escapeHtml(review.quote)}”</blockquote>`
      : `<p class="review-summary">${escapeHtml(review.summary || 'Verified customer feedback.')}</p>`;
    const reviewId = safeDomId(review.id || review.reviewer || 'review');

    return `<article class="review-card" id="review-${reviewId}">
      <div class="review-source"><span>${escapeHtml(review.source || 'Customer review')}</span><span class="stars" aria-label="${escapeHtml(review.rating)} out of 5 stars">${stars}</span></div>
      ${content}
      <div class="review-meta"><strong>${escapeHtml(review.reviewer || 'Customer')}</strong><div class="review-tags">${tags}</div></div>
    </article>`;
  }).join('');
}

function relatedReviewLinks(item) {
  const ids = Array.isArray(item.review_ids) ? item.review_ids : [];
  const related = ids.map((id) => reviewArchive.find((review) => review.id === id)).filter(Boolean);
  if (!related.length) return '';

  const links = related.map((review) => {
    const target = safeDomId(review.id || 'review');
    return `<a href="#review-${target}">${escapeHtml(review.reviewer || 'Related testimonial')}</a>`;
  }).join(' · ');
  return `<p class="related-proof"><strong>Related testimonial:</strong> ${links}</p>`;
}

function renderTransformations() {
  if (!caseGrid) return;
  const publishable = transformationArchive.filter((item) => item.consent_confirmed === true && item.before_image && item.after_image);
  const visibleItems = publishable.filter(matchesTransformation);
  if (transformationResultCount) transformationResultCount.textContent = visibleItems.length;

  if (!publishable.length && activeFilter === 'all' && !searchTerm) {
    caseGrid.innerHTML = `<article class="case-card">
      <div class="comparison-placeholder"><div><small>BEFORE</small>PHOTO</div><div><small>AFTER</small>PHOTO</div></div>
      <div class="case-copy"><h3>First client comparison coming next</h3><p>The repository is ready for consented before-and-after media, service details, and a client caption.</p><span class="status-pill">Awaiting real client media</span></div>
    </article>`;
    return;
  }

  if (!visibleItems.length) {
    caseGrid.innerHTML = '<article class="case-card loading-card"><p>No published before-and-after results match this filter yet.</p></article>';
    return;
  }

  caseGrid.innerHTML = visibleItems.map((item) => {
    const tags = transformationTags(item).map((tag) => `<span>${escapeHtml(titleCase(tag))}</span>`).join('');
    return `<article class="case-card">
      <div class="comparison-placeholder">
        <div style="background-image:url('${escapeHtml(item.before_image)}');background-size:cover;background-position:center"><small>BEFORE</small></div>
        <div style="background-image:url('${escapeHtml(item.after_image)}');background-size:cover;background-position:center"><small>AFTER</small></div>
      </div>
      <div class="case-copy">
        <div class="case-tags">${tags}</div>
        <h3>${escapeHtml(item.title || 'Client result')}</h3>
        <p>${escapeHtml(item.caption || '')}</p>
        ${relatedReviewLinks(item)}
        <span class="status-pill">Published client result</span>
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
    ? `Filtering the proof archive by ${parts.join(' and ')}.`
    : 'Showing the complete proof archive.';
}

function renderArchive() {
  buildFilterChips();
  renderReviews();
  renderTransformations();
  updateFilterSummary();
}

async function loadArchive() {
  try {
    const [reviewData, transformationData] = await Promise.all([
      getJson('./data/reviews.json'),
      getJson('./data/transformations.json')
    ]);

    if (reviewData.business) {
      const rating = reviewData.business.rating ?? '—';
      const reviewCount = reviewData.business.review_count ?? 0;
      if (heroRating) heroRating.textContent = rating;
      if (heroReviewCount) heroReviewCount.textContent = reviewCount;
      if (cardRating) cardRating.textContent = `${rating} / 5`;
      if (cardReviewCount) cardReviewCount.textContent = reviewCount;
    }

    reviewArchive = Array.isArray(reviewData.reviews) ? reviewData.reviews : [];
    transformationArchive = Array.isArray(transformationData.transformations) ? transformationData.transformations : [];
    renderArchive();
  } catch (error) {
    console.warn(error);
    if (reviewGrid) reviewGrid.innerHTML = '<article class="review-card loading-card"><p>Review data is temporarily unavailable.</p></article>';
    if (caseGrid) caseGrid.innerHTML = '<article class="case-card loading-card"><p>Result data is temporarily unavailable.</p></article>';
  }
}

serviceFilters?.addEventListener('click', (event) => {
  const button = event.target.closest('[data-filter]');
  if (!button) return;
  activeFilter = normalize(button.dataset.filter || 'all');
  renderArchive();
});

proofSearch?.addEventListener('input', (event) => {
  searchTerm = normalize(event.target.value);
  renderArchive();
});

loadArchive();

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
