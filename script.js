// script.js (for create-post.html)
import { apiFetch, requireAuth } from './api-client.js';

requireAuth(); // redirect to auth.html if not logged in


// ----- Sign out -----
const signoutLink = document.querySelector('#signoutLink');
if (signoutLink) {
  signoutLink.addEventListener('click', () => {
    console.log('[auth] sign out clicked (create-post)');

    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.warn('storage clear failed', e);
    }
    // Let the link navigate to auth.html
  });
}

// ------- elements -------
const fileInput = document.querySelector('#file');
const chooseFileBtn = document.querySelector('#chooseFileBtn');
const drop = document.querySelector('#drop');
const imgBox = document.querySelector('#imgBox');
const caption = document.querySelector('#caption');
const capOut = document.querySelector('#capOut');
const counter = document.querySelector('#counter');
const postBtn = document.querySelector('#postBtn');
const resetBtn = document.querySelector('#resetBtn');
const toast = document.querySelector('#toast');

const MAX = 280;

let hasImage = false;
let imageData = null;

// ------- helpers -------

function showToast(msg, isError = false) {
  toast.textContent = msg;
  toast.classList.remove('hidden');
  toast.classList.toggle('toast-error', isError);
  setTimeout(() => toast.classList.add('hidden'), 3000);
}

function updateCounter() {
  const n = caption.value.length;
  counter.textContent = `${n} / ${MAX}`;
  counter.className = 'counter ' + (n > MAX ? 'bad' : n > 240 ? 'warn' : 'ok');
  capOut.textContent = caption.value.slice(0, MAX);
  capOut.style.display = n ? 'block' : 'none';
  updatePostState();
}

function updatePostState() {
  const tooLong = caption.value.length > MAX;
  postBtn.disabled = !hasImage || tooLong || !caption.value.trim();
}

function setPreviewImage(src) {
  imageData = src;
  hasImage = true;
  imgBox.classList.remove('empty');
  imgBox.innerHTML = '';

  const img = new Image();
  img.alt = 'Selected image preview';
  img.src = src;
  img.onload = () => updatePostState();
  imgBox.appendChild(img);
}

function resetForm() {
  fileInput.value = '';
  imageData = null;
  hasImage = false;
  imgBox.classList.add('empty');
  imgBox.innerHTML = '<span class="preview-placeholder">Image preview will appear here.</span>';
  caption.value = '';
  capOut.textContent = '';
  capOut.style.display = 'none';
  updateCounter();
}

// ------- image picking -------

chooseFileBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    showToast('Please choose an image file.', true);
    fileInput.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = e => setPreviewImage(e.target.result);
  reader.readAsDataURL(file);
});

['dragenter', 'dragover'].forEach(ev =>
  drop.addEventListener(ev, e => {
    e.preventDefault();
    e.stopPropagation();
    drop.classList.add('dragging');
  })
);

['dragleave', 'drop'].forEach(ev =>
  drop.addEventListener(ev, e => {
    e.preventDefault();
    e.stopPropagation();
    drop.classList.remove('dragging');
  })
);

drop.addEventListener('drop', e => {
  const file = e.dataTransfer.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    showToast('Please drop an image file.', true);
    return;
  }
  const reader = new FileReader();
  reader.onload = ev => setPreviewImage(ev.target.result);
  reader.readAsDataURL(file);
});

// ------- caption & buttons -------

caption.addEventListener('input', updateCounter);

resetBtn.addEventListener('click', () => resetForm());

postBtn.addEventListener('click', async () => {
  try {
    const text = caption.value.trim();
    if (!imageData || !text) {
      return showToast('Image and caption are required.', true);
    }

    postBtn.disabled = true;

    // IMPORTANT: only send 2 fields -> matches sp_create_post(?,?,?)
    const res = await apiFetch('/posts', {
      method: 'POST',
      body: JSON.stringify({
        imageData,
        caption: text
      })
    });

    if (!res.ok) {
      throw new Error(res.error || 'Failed to post.');
    }

    showToast('Posted! 🎉');
    resetForm();

    // Optional: redirect to feed after a short delay
    setTimeout(() => {
      window.location.href = 'feed.html';
    }, 800);
  } catch (err) {
    console.error(err);
    showToast(err.message || 'Failed to create post.', true);
    postBtn.disabled = false;
  }
});

// init
updateCounter();