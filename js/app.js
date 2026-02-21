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

// タブ切り替え
document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.input-area').forEach((a) => a.classList.remove('active'));
    tab.classList.add('active');
    document.querySelector(`.${tab.dataset.tab}-input-area`).classList.add('active');
  });
});

// 判定実行
async function judgeGag(gagText) {
  const text = (gagText || gagInput.value).trim();
  if (!text) {
    alert('ギャグを入力してください');
    return;
  }

  judgeBtn.disabled = true;
  judgeBtn.textContent = '判定中...';

  try {
    const res = await fetch('/api/judge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gag: text }),
    });

    let data;
    try {
      data = await res.json();
    } catch {
      throw new Error(`サーバーエラー (${res.status})`);
    }

    if (!res.ok) {
      const detail = data.detail ? `\n\n【詳細】\n${data.detail}` : '';
      throw new Error((data.error || '判定に失敗しました') + detail);
    }

    showResult(data.score, data.comment);
    addToLocalHistory(text, data.score, data.comment);
    loadBest3();
    gagInput.value = '';
    micResult.textContent = '';
  } catch (err) {
    alert(err.message);
  } finally {
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
    alert('マイクで話してから判定してください');
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
  let history = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  history.push({ gag, score, comment });
  history.sort((a, b) => b.score - a.score);
  history = history.slice(0, 10);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

function loadBest3() {
  const items = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]').slice(0, 3);
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
    if (e.error !== 'aborted') {
      micStatus.textContent = 'エラー: ' + (e.error === 'no-speech' ? '音声が検出されませんでした' : e.error);
    }
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
  recognition.start();
});

// 初回ロード
loadBest3();
