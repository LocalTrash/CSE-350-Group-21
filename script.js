// Elements
const fileInput = document.querySelector('#file');
const drop = document.querySelector('#drop');
const imgBox = document.querySelector('#imgBox');
const caption = document.querySelector('#caption');
const capOut = document.querySelector('#capOut');
const counter = document.querySelector('#counter');
const postBtn = document.querySelector('#postBtn');
const resetBtn = document.querySelector('#resetBtn');
const chips = document.querySelectorAll('.chip');
const toast = document.querySelector('#toast');

// State
const MAX = 280;
let visibility = 'public';
let hasImage = false;

// Helpers
const updateCounter = () => {
  const n = caption.value.length;
  counter.textContent = `${n} / ${MAX}`;
  counter.className = 'counter ' + (n > MAX ? 'bad' : n > 240 ? 'warn' : 'ok');
  capOut.style.display = n ? 'block' : 'none';
  capOut.textContent = caption.value.slice(0, MAX);
  updatePostState();
};

const updatePostState = () => {
  const tooLong = caption.value.length > MAX;
  postBtn.disabled = !hasImage || tooLong;
};

const setPreviewImage = (src) => {
  imgBox.innerHTML = '';
  const img = new Image();
  img.alt = 'Selected image preview';
  img.src = src;
  img.onload = () => { hasImage = true; updatePostState(); };
  imgBox.appendChild(img);
};

const readFile = (file) => {
  if (!file) return;
  if (!/image\/(png|jpe?g)/i.test(file.type)) {
    alert('Please select a JPEG or PNG image.');
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    alert('Max file size is 2 MB.');
    return;
  }
  const reader = new FileReader();
  reader.onload = e => setPreviewImage(e.target.result);
  reader.readAsDataURL(file);
};

// Browse click-through
drop.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', e => readFile(e.target.files[0]));

// Drag & drop
['dragenter','dragover'].forEach(ev =>
  drop.addEventListener(ev, e => {
    e.preventDefault(); e.stopPropagation(); drop.classList.add('dragover');
  })
);
['dragleave','drop'].forEach(ev =>
  drop.addEventListener(ev, e => {
    e.preventDefault(); e.stopPropagation(); drop.classList.remove('dragover');
  })
);
drop.addEventListener('drop', e => {
  const file = e.dataTransfer.files && e.dataTransfer.files[0];
  readFile(file);
});

// Caption live count
caption.addEventListener('input', updateCounter);
updateCounter();

// Visibility choice chips
chips.forEach(ch => ch.addEventListener('click', () => {
  chips.forEach(c => c.classList.remove('active'));
  ch.classList.add('active');
  visibility = ch.dataset.value;
}));

// Clear form
resetBtn.addEventListener('click', () => {
  caption.value = '';
  updateCounter();
  imgBox.innerHTML = '<span>No image selected</span>';
  hasImage = false;
  updatePostState();
});

// Mock Post (replace with real fetch later)
postBtn.addEventListener('click', async () => {
  toast.textContent = `Posted (visibility: ${visibility}) — mock`;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1800);
});