const installButton = document.querySelector('#installButton');
const year = document.querySelector('#year');
const reviewGrid = document.querySelector('#reviewGrid');
const caseGrid = document.querySelector('#caseGrid');
const heroRating = document.querySelector('#heroRating');
const heroReviewCount = document.querySelector('#heroReviewCount');
let deferredInstallPrompt = null;

if (year) year.textContent = new Date().getFullYear();

const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

async function getJson(path) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${path} failed: ${response.status}`);
  return response.json();
}

async function loadReviews() {
  if (!reviewGrid) return;
  try {
    const data = await getJson('./data/reviews.json');
    if (data.business) {
      if (heroRating) heroRating.textContent = data.business.rating ?? '—';
      if (heroReviewCount) heroReviewCount.textContent = data.business.review_count ?? 0;
    }

    const reviews = Array.isArray(data.reviews) ? data.reviews : [];
    if (!reviews.length) {
      reviewGrid.innerHTML = '<article class="review-card"><p class="review-summary">Verified customer reviews will appear here as they are added.</p></article>';
      return;
    }

    reviewGrid.innerHTML = reviews.map((review) => {
      const stars = '★'.repeat(Math.max(1, Math.min(5, Number(review.rating) || 5)));
      const tags = (review.service_tags || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join('');
      const content = review.quote
        ? `<blockquote>“${escapeHtml(review.quote)}”</blockquote>`
        : `<p class="review-summary">${escapeHtml(review.summary || 'Verified customer feedback.')}</p>`;

      return `<article class="review-card">
        <div class="review-source"><span>${escapeHtml(review.source || 'Customer review')}</span><span class="stars" aria-label="${escapeHtml(review.rating)} out of 5 stars">${stars}</span></div>
        ${content}
        <div class="review-meta"><strong>${escapeHtml(review.reviewer || 'Customer')}</strong><div class="review-tags">${tags}</div></div>
      </article>`;
    }).join('');
  } catch (error) {
    console.warn(error);
    reviewGrid.innerHTML = '<article class="review-card"><p class="review-summary">Review data is temporarily unavailable.</p></article>';
  }
}

async function loadTransformations() {
  if (!caseGrid) return;
  try {
    const data = await getJson('./data/transformations.json');
    const items = Array.isArray(data.transformations) ? data.transformations : [];

    if (!items.length) {
      caseGrid.innerHTML = `<article class="case-card">
        <div class="comparison-placeholder"><div><small>BEFORE</small>PHOTO</div><div><small>AFTER</small>PHOTO</div></div>
        <div class="case-copy"><h3>First client comparison coming next</h3><p>The repository is ready for consented before-and-after media, service details, and a client caption.</p><span class="status-pill">Awaiting real client media</span></div>
      </article>`;
      return;
    }

    caseGrid.innerHTML = items
      .filter((item) => item.consent_confirmed === true && item.before_image && item.after_image)
      .map((item) => `<article class="case-card">
        <div class="comparison-placeholder">
          <div style="background-image:url('${escapeHtml(item.before_image)}');background-size:cover;background-position:center"><small>BEFORE</small></div>
          <div style="background-image:url('${escapeHtml(item.after_image)}');background-size:cover;background-position:center"><small>AFTER</small></div>
        </div>
        <div class="case-copy"><h3>${escapeHtml(item.title || 'Client result')}</h3><p>${escapeHtml(item.caption || '')}</p><span class="status-pill">Published client result</span></div>
      </article>`).join('') || '<article class="case-card loading-card"><p>No consented client result sets are ready to publish yet.</p></article>';
  } catch (error) {
    console.warn(error);
    caseGrid.innerHTML = '<article class="case-card loading-card"><p>Result data is temporarily unavailable.</p></article>';
  }
}

loadReviews();
loadTransformations();

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
