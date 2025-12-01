// feed.js
import { apiFetch, requireAuth } from './api-client.js';

// Redirect to auth.html if not logged in
requireAuth();

const signoutLink = document.querySelector('#signoutLink');
if (signoutLink) {
  signoutLink.addEventListener('click', () => {
    console.log('[auth] sign out clicked');

    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.warn('storage clear failed', e);
    }
  });
}

//  DOM 
const feedList = document.querySelector('#feedList');
const loadMoreBtn = document.querySelector('#loadMoreBtn');
const scopeChips = document.querySelectorAll('#scopeChips .chip');
const searchInput = document.querySelector('#search');
const toast = document.querySelector('#toast');
const emptyState = document.querySelector('#emptyState');

//  STATE 
let currentScope = 'all';
let currentQuery = '';
let page = 1;
const PAGE_SIZE = 5;
let loading = false;
let reachedEnd = false;



function showToast(msg, isError = false) {
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.remove('hidden');
  toast.classList.toggle('toast-error', isError);
  setTimeout(() => toast.classList.add('hidden'), 2500);
}

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function clearFeed() {
  if (feedList) feedList.innerHTML = '';
  if (emptyState) emptyState.style.display = 'none';
  page = 1;
  reachedEnd = false;
}

function updateLoadMoreVisibility() {
  if (!loadMoreBtn) return;
  loadMoreBtn.disabled = loading || reachedEnd;
  loadMoreBtn.style.display = reachedEnd ? 'none' : 'inline-flex';
}

// COMMENTS general

async function loadCommentsForPost(postId, listEl) {
  if (!listEl) return;
  listEl.innerHTML = '';

  try {
    const res = await apiFetch(`/posts/${postId}/comments`);
    if (!res.ok) throw new Error(res.error || 'Failed to load comments.');

    const comments = res.comments || [];
    comments.forEach(c => {
      const row = document.createElement('div');
      row.className = 'ig-comment';
      row.innerHTML = `
        <span class="ig-comment-user">${c.username}</span>
        ${c.body}
      `;
      listEl.appendChild(row);
    });
  } catch (err) {
    console.error('[feed] load comments error', err);
  }
}

async function addComment(postId, text, listEl, inputEl) {
  if (!text.trim()) return;

  try {
    const res = await apiFetch(`/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body: text.trim() })
    });

    if (!res.ok) throw new Error(res.error || 'Failed to add comment.');

    const c = res.comment;
    if (inputEl) inputEl.value = '';

    if (c && listEl) {
      const row = document.createElement('div');
      row.className = 'ig-comment';
      row.innerHTML = `
        <span class="ig-comment-user">${c.username}</span>
        ${c.body}
      `;
      listEl.appendChild(row);
    }
  } catch (err) {
    console.error('[feed] add comment error', err);
    showToast(err.message || 'Could not add comment.', true);
  }
}



async function toggleLike(postId, likeBtn, likeCountEl) {
  const currentlyLiked = likeBtn.classList.contains('liked');
  const endpoint = currentlyLiked
    ? `/posts/${postId}/unlike`
    : `/posts/${postId}/like`;

  try {
    const res = await apiFetch(endpoint, { method: 'POST' });
    if (!res.ok) throw new Error(res.error || 'Failed to update like.');

    let count = parseInt(likeCountEl.textContent || '0', 10) || 0;
    count = currentlyLiked ? Math.max(0, count - 1) : count + 1;
    likeCountEl.textContent = String(count);
    likeBtn.classList.toggle('liked', !currentlyLiked);
  } catch (err) {
    console.error('[feed] like/unlike error', err);
    showToast('Could not update like.', true);
  }
}


function buildPostCard(post) {
  const card = document.createElement('article');
  card.className = 'ig-card';
  card.dataset.postId = post.id;

  const likeCount = post.likes || 0;
  const liked = !!post.liked;

  card.innerHTML = `
    <header class="ig-card-header">
      <div class="ig-user-block">
        <div class="ig-avatar">${(post.username || 'U')[0].toUpperCase()}</div>
        <div class="ig-user-meta">
          <div class="ig-username">${post.username}</div>
          <div class="ig-time">${formatTime(post.created_at)}</div>
        </div>
      </div>
    </header>

    <div class="ig-img-wrap">
      <img class="ig-img" src="${post.image_url}" alt="${post.caption || ''}" />
    </div>

    <footer class="ig-card-footer">
      <div class="ig-actions">
        <button class="ig-like-btn ${liked ? 'liked' : ''}" type="button">
          <span class="ig-like-icon">♥</span>
        </button>
        <span class="ig-likes">
          <span class="ig-like-count">${likeCount}</span>
          ${likeCount === 1 ? ' like' : ' likes'}
        </span>
      </div>

      <p class="ig-caption">
        <span class="ig-caption-user">${post.username}</span>
        ${post.caption || ''}
      </p>

      <div class="ig-comment-list"></div>

      <div class="ig-comment-input-row">
        <input
          class="ig-comment-input"
          type="text"
          placeholder="Add a comment…"
        />
        <button class="ig-comment-send" type="button">Post</button>
      </div>
    </footer>
  `;

  // Wire up like button
  const likeBtn = card.querySelector('.ig-like-btn');
  const likeCountEl = card.querySelector('.ig-like-count');
  likeBtn.addEventListener('click', () =>
    toggleLike(post.id, likeBtn, likeCountEl)
  );

  // Wire up comments
  const commentsListEl = card.querySelector('.ig-comment-list');
  const commentInput = card.querySelector('.ig-comment-input');
  const commentSend = card.querySelector('.ig-comment-send');

  commentSend.addEventListener('click', () =>
    addComment(post.id, commentInput.value, commentsListEl, commentInput)
  );

  commentInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addComment(post.id, commentInput.value, commentsListEl, commentInput);
    }
  });

  loadCommentsForPost(post.id, commentsListEl);

  return card;
}

// load the posts

async function loadPosts({ append = false } = {}) {
  if (loading) return;
  loading = true;
  updateLoadMoreVisibility();

  try {
    const params = new URLSearchParams({
      scope: currentScope,
      q: currentQuery,
      page: String(page),
      pageSize: String(PAGE_SIZE)
    });

    const res = await apiFetch(`/posts?${params.toString()}`);
    if (!res.ok) throw new Error(res.error || 'Failed to load posts.');

    const posts = res.posts || [];

    if (!append) {
      if (feedList) feedList.innerHTML = '';
      if (emptyState) emptyState.style.display = 'none';
    }

    if (posts.length === 0 && page === 1) {
      if (emptyState) emptyState.style.display = 'block';
      reachedEnd = true;
      updateLoadMoreVisibility();
      return;
    }

    if (posts.length < PAGE_SIZE) {
      reachedEnd = true;
    }

    posts.forEach(p => {
      const card = buildPostCard(p);
      feedList.appendChild(card);
    });

    updateLoadMoreVisibility();
  } catch (err) {
    console.error('[feed] load posts error', err);
    showToast(err.message || 'Failed to load feed.', true);
  } finally {
    loading = false;
    updateLoadMoreVisibility();
  }
}

// all the events

scopeChips.forEach(chip => {
  chip.addEventListener('click', () => {
    const scope = chip.dataset.scope || 'all';
    currentScope = scope;

    scopeChips.forEach(c => c.classList.remove('chip-active'));
    chip.classList.add('chip-active');

    clearFeed();
    loadPosts({ append: false });
  });
});


let searchTimer = null;
if (searchInput) {
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      currentQuery = searchInput.value.trim();
      clearFeed();
      loadPosts({ append: false });
    }, 350);
  });
}

// load more
if (loadMoreBtn) {
  loadMoreBtn.addEventListener('click', () => {
    if (loading || reachedEnd) return;
    page += 1;
    loadPosts({ append: true });
  });
}

// initial load of the content
document.addEventListener('DOMContentLoaded', () => {
  clearFeed();
  loadPosts({ append: false });
});