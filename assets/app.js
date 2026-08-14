const installButton = document.querySelector('#installButton');
const year = document.querySelector('#year');
const reviewsGrid = document.querySelector('#reviewsGrid');
const ratingValue = document.querySelector('#ratingValue');
const reviewCount = document.querySelector('#reviewCount');
let deferredInstallPrompt = null;

if (year) year.textContent = new Date().getFullYear();

const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

async function loadReviews() {
  if (!reviewsGrid) return;
  try {
    const response = await fetch('./data/reviews.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Review data failed: ${response.status}`);
    const data = await response.json();

    if (data.business) {
      if (ratingValue) ratingValue.textContent = data.business.rating ?? '—';
      if (reviewCount) reviewCount.textContent = `${data.business.review_count ?? 0} Google reviews`;
    }

    const reviews = Array.isArray(data.reviews) ? data.reviews : [];
    if (!reviews.length) {
      reviewsGrid.innerHTML = '<article class="review-card"><p class="review-quote">Verified customer reviews will appear here as they are added to the repository.</p></article>';
      return;
    }

    reviewsGrid.innerHTML = reviews.map((review) => {
      const stars = '★'.repeat(Math.max(1, Math.min(5, Number(review.rating) || 5)));
      const body = review.quote || review.summary || 'Verified customer feedback.';
      const tags = (review.service_tags || []).map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('');
      return `
        <article class="review-card">
          <div class="review-stars" aria-label="${escapeHtml(review.rating)} out of 5 stars">${stars}</div>
          <p class="review-quote">“${escapeHtml(body)}”</p>
          <div class="review-meta">
            <strong>${escapeHtml(review.reviewer || 'Customer')}</strong><br />
            ${escapeHtml(review.source || 'Customer review')}
            ${tags ? `<div class="review-tags">${tags}</div>` : ''}
          </div>
        </article>`;
    }).join('');
  } catch (error) {
    console.warn(error);
    reviewsGrid.innerHTML = '<article class="review-card"><p class="review-quote">Review data is temporarily unavailable.</p></article>';
  }
}

loadReviews();

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
