const gagInput = document.getElementById('gagInput');
const judgeBtn = document.getElementById('judgeBtn');
const resultSection = document.getElementById('resultSection');
const resultCard = document.getElementById('resultCard');
const scoreNumber = document.getElementById('scoreNumber');
const commentEl = document.getElementById('comment');
const bestList = document.getElementById('bestItems');
const emptyState = document.getElementById('emptyState');
const micBtn = document.getElementById('micBtn');
const micStatus = document.getElementById('micStatus');
const micResult = document.getElementById('micResult');
const formError = document.getElementById('formError');
const MAX_GAG = 400;

function showError(message) {
  if (!message) {
    formError.hidden = true;
    formError.textContent = '';
    return;
  }
  formError.hidden = false;
  formError.textContent = message;
}

function readHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// タブ切り替え
document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.input-area').forEach((a) => a.classList.remove('active'));
    tab.classList.add('active');
    document.querySelector(`.${tab.dataset.tab}-input-area`).classList.add('active');
    showError('');
  });
});

// 判定実行
async function judgeGag(gagText) {
  const text = (gagText || gagInput.value).trim();
  if (!text) {
    showError('ギャグを入力してください');
    return;
  }
  if (text.length > MAX_GAG) {
    showError(`ギャグは${MAX_GAG}文字以内にしてください`);
    return;
  }

  showError('');
  judgeBtn.disabled = true;
  judgeBtn.textContent = '判定中...';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 40000);

  try {
    const res = await fetch('/api/judge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gag: text }),
      signal: controller.signal,
    });

    let data;
    try {
      data = await res.json();
    } catch {
      throw new Error(`サーバーエラー (${res.status})`);
    }

    if (!res.ok) {
      throw new Error(data.error || '判定に失敗しました');
    }

    showResult(data.score, data.comment);
    addToLocalHistory(text, data.score, data.comment);
    loadBest3();
    gagInput.value = '';
    micResult.textContent = '';
  } catch (err) {
    const message = err.name === 'AbortError'
      ? '判定に時間がかかっています。もう一度お試しください。'
      : (err.message || '判定に失敗しました');
    showError(message);
  } finally {
    clearTimeout(timer);
    judgeBtn.disabled = false;
    judgeBtn.textContent = '判定する';
  }
}

judgeBtn.addEventListener('click', () => {
  const activeArea = document.querySelector('.input-area.active');
  const text = activeArea.classList.contains('mic-input-area')
    ? micResult.textContent.trim()
    : gagInput.value.trim();
  if (activeArea.classList.contains('mic-input-area') && !text) {
    showError('マイクで話してから判定してください');
    return;
  }
  judgeGag(text);
});

function showResult(score, commentText) {
  scoreNumber.textContent = score;
  commentEl.textContent = commentText || '';
  resultCard.classList.add('visible');
  resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

const STORAGE_KEY = 'gag-judge-history';

function addToLocalHistory(gag, score, comment) {
  let history = readHistory();
  history.push({ gag, score, comment });
  history.sort((a, b) => b.score - a.score);
  history = history.slice(0, 10);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

function loadBest3() {
  const items = readHistory().slice(0, 3);
  bestList.innerHTML = '';

  if (items.length === 0) {
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';
  const ranks = ['🥇', '🥈', '🥉'];
  items.forEach((item, i) => {
    const li = document.createElement('li');
    li.className = 'best-item';
    li.innerHTML = `
      <span class="best-rank">${ranks[i] || (i + 1) + '.'}</span>
      <div class="best-content">
        <div class="best-gag">${escapeHtml(item.gag)}</div>
        <div class="best-score">${item.score}点</div>
      </div>
    `;
    bestList.appendChild(li);
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// マイク入力（Web Speech API）
let recognition = null;
let isRecording = false;

function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    micStatus.textContent = 'お使いのブラウザは音声認識に対応していません';
    micBtn.disabled = true;
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = 'ja-JP';
  recognition.continuous = false;
  recognition.interimResults = true;

  recognition.onstart = () => {
    isRecording = true;
    micBtn.classList.add('recording');
    micBtn.querySelector('.mic-label').textContent = '録音中...';
    micStatus.textContent = '話してください...';
  };

  recognition.onresult = (e) => {
    let final = '';
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const transcript = e.results[i][0].transcript;
      if (e.results[i].isFinal) {
        final += transcript;
      } else {
        interim += transcript;
      }
    }
    micResult.textContent = final || interim;
  };

  recognition.onend = () => {
    isRecording = false;
    micBtn.classList.remove('recording');
    micBtn.querySelector('.mic-label').textContent = '録音開始';
    micStatus.textContent = micResult.textContent ? '認識完了。判定するを押してください' : 'マイクボタンを押して話してください';
  };

  recognition.onerror = (e) => {
    if (e.error === 'aborted') return;
    const messages = {
      'no-speech': '音声が検出されませんでした',
      'not-allowed': 'マイクの使用が許可されていません',
      'service-not-allowed': 'マイクの使用が許可されていません',
      'audio-capture': 'マイクが見つかりません',
      network: '音声認識の通信に失敗しました',
    };
    micStatus.textContent = messages[e.error] || '音声認識でエラーが起きました';
  };
}

micBtn.addEventListener('click', () => {
  if (!recognition) {
    initSpeechRecognition();
    if (!recognition) return;
  }

  if (isRecording) {
    recognition.stop();
    return;
  }

  micResult.textContent = '';
  try {
    recognition.start();
  } catch {
    micStatus.textContent = 'マイクを開始できませんでした。もう一度押してください';
  }
});

// 初回ロード
loadBest3();
