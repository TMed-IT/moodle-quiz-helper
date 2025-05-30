(() => {
    function addFloatingButton() {
      if (document.getElementById('mqee-fab')) return;
  
      const footerButton = document.evaluate('/html/body/div[2]/div[5]/footer/div[1]/button', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
      if (!footerButton) return;
  
      const btn = document.createElement('button');
      btn.id = 'mqee-fab';
      btn.title = 'Click to copy';
  
      const footerRect = footerButton.getBoundingClientRect();
      Object.assign(btn.style, {
        position: 'fixed',
        right: `${window.innerWidth - footerRect.right - 5}px`,
        bottom: `${window.innerHeight - footerRect.top + 24}px`,
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        border: 'none',
        background: '#1976d2',
        color: '#fff',
        fontSize: '24px',
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(0,0,0,0.25)'
      });
      btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-brain-circuit-icon lucide-brain-circuit"><path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M9 13a4.5 4.5 0 0 0 3-4"/><path d="M6.003 5.125A3 3 0 0 0 6.401 6.5"/><path d="M3.477 10.896a4 4 0 0 1 .585-.396"/><path d="M6 18a4 4 0 0 1-1.967-.516"/><path d="M12 13h4"/><path d="M12 18h6a2 2 0 0 1 2 2v1"/><path d="M12 8h8"/><path d="M16 8V5a2 2 0 0 1 2-2"/><circle cx="16" cy="13" r=".5"/><circle cx="18" cy="3" r=".5"/><circle cx="20" cy="21" r=".5"/><circle cx="20" cy="8" r=".5"/></svg>`;
      btn.style.display = 'flex';
      btn.style.alignItems = 'center';
      btn.style.justifyContent = 'center';
      btn.addEventListener('click', copyQuizTable);
      document.body.appendChild(btn);
    }
  
    function parseQuiz() {
      const q = document.querySelector('div.que');
      if (!q) {
        throw new Error('Question block not found.');
      }

      const qtext = q.querySelector('.qtext')?.innerText.trim() ?? '';
      const optionNodes = q.querySelector('.answer')?.querySelectorAll('div.r0, div.r1') ?? [];
      const options = Array.from(optionNodes, n => n.querySelector('div > div > div > div')?.innerText.trim());

      return { qtext, options, qElem: q };
    }
  
    async function getProbabilities(qtext, options) {
      const { apiKey, modelId, temperature } = await chrome.storage.sync.get(['apiKey', 'modelId', 'temperature']);
      if (!apiKey) {
        throw new Error('APIキーが設定されていません。拡張機能の設定からAPIキーを設定してください。');
      }

      const prompt = `以下の問題と選択肢について、それぞれの選択肢が正解である確率を0から1の間の数値で評価してください。\n\n問題: ${qtext}\n\n選択肢:\n${options.map((opt, i) => `${String.fromCharCode(97 + i)}. ${opt}`).join('\n')}`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature,
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'object',
              properties: Object.fromEntries(
                options.map((_, i) => [
                  `option_${String.fromCharCode(97 + i)}`,
                  { type: 'number' }
                ])
              )
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error('APIリクエストに失敗しました');
      }

      const data = await response.json();
      const result = JSON.parse(data.candidates[0].content.parts[0].text);
      return result;
    }

    function showProbabilityNextToQuestion(probabilities, qElem) {
      // 既存の確率表示を削除
      const old = qElem.querySelectorAll('.mqee-probability');
      old.forEach(e => e.remove());

      // 各選択肢の要素を取得
      const optionNodes = qElem.querySelector('.answer')?.querySelectorAll('div.r0, div.r1') ?? [];
      optionNodes.forEach((opt, i) => {
        const key = `option_${String.fromCharCode(97 + i)}`;
        const prob = probabilities[key];
        if (prob === undefined) return;

        // 選択肢のテキスト要素を取得
        const optTextElem = opt.querySelector('div > div > div > div');
        if (!optTextElem) return;

        // 確率表示用のspanを作成
        const span = document.createElement('span');
        span.className = 'mqee-probability';
        span.style.cssText = `
          margin-left: 0.5em;
          font-size: 0.9em;
          color: #1976d2;
          background: #e3f2fd;
          border-radius: 4px;
          padding: 2px 6px;
          display: inline-block;
        `;
        span.textContent = `${(prob * 100).toFixed(1)}%`;
        optTextElem.appendChild(span);
      });
    }

    function shouldRunOnCurrentPage() {
      const url = window.location.href;
      // attempt.phpのページでのみ実行
      return url.includes('mod/quiz/attempt.php');
    }

    async function main() {
      // URLチェックを追加
      if (!shouldRunOnCurrentPage()) return;

      try {
        const { qtext, options, qElem } = parseQuiz();
        const probabilities = await getProbabilities(qtext, options);
        showProbabilityNextToQuestion(probabilities, qElem);
      } catch (err) {
        console.error(err);
      }
    }

    // ページ読み込み時に自動実行（URLチェック付き）
    window.addEventListener('DOMContentLoaded', () => {
      if (shouldRunOnCurrentPage()) {
        main();
      }
    });
  
    async function copyQuizTable() {
      try {
        const { qtext, options } = parseQuiz();

        // 確率を取得
        const probabilities = await getProbabilities(qtext, options);
        showProbabilityNextToQuestion(probabilities, qElem);

        const indexedOptions = options.map((opt, i) => 
          `${String.fromCharCode(97 + i)}. ${opt}`
        );
        const text = [qtext, ...indexedOptions].join('\n');
        const blobText = new Blob([text], { type: 'text/plain' });
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/plain': blobText
          })
        ]);

        toast('クイズをコピーしました');
      } catch (err) {
        console.error(err);
        toast('エラー: ' + err.message);
      }
    }
  
    function toast(msg) {
      const n = document.createElement('div');
      n.textContent = msg;
      Object.assign(n.style, {
        position: 'fixed',
        left: '50%',
        bottom: '80px',
        transform: 'translateX(-50%)',
        background: '#323232',
        color: '#fff',
        padding: '8px 16px',
        borderRadius: '4px',
        zIndex: 10000,
        opacity: '0',
        transition: 'opacity .3s'
      });
      document.body.appendChild(n);
      requestAnimationFrame(() => (n.style.opacity = '1'));
      setTimeout(() => {
        n.style.opacity = '0';
        setTimeout(() => n.remove(), 300);
      }, 2500);
    }
  
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (msg?.action === 'COPY_QUIZ_TABLE') copyQuizTable();
      sendResponse?.();
    });
  
    addFloatingButton();
  })();
  