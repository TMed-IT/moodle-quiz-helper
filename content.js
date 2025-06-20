(() => {
    function addProbabilityButtons() {
      document.querySelectorAll('.mqee-prob-btn').forEach(btn => btn.remove());
      
      const questions = document.querySelectorAll('div.que');
      questions.forEach((question, index) => {
        const btn = document.createElement('button');
        btn.className = 'mqee-prob-btn';
        btn.dataset.questionIndex = index;
        btn.title = '確率を表示';
        
        Object.assign(btn.style, {
          position: 'absolute',
          bottom: '10px',
          right: '10px',
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          border: 'none',
          background: '#1976d2',
          color: '#fff',
          fontSize: '16px',
          cursor: 'pointer',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: '100'
        });
        
        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M9 13a4.5 4.5 0 0 0 3-4"/><path d="M6.003 5.125A3 3 0 0 0 6.401 6.5"/><path d="M3.477 10.896a4 4 0 0 1 .585-.396"/><path d="M6 18a4 4 0 0 1-1.967-.516"/><path d="M12 13h4"/><path d="M12 18h6a2 2 0 0 1 2 2v1"/><path d="M12 8h8"/><path d="M16 8V5a2 2 0 0 1 2-2"/><circle cx="16" cy="13" r=".5"/><circle cx="18" cy="3" r=".5"/><circle cx="20" cy="21" r=".5"/><circle cx="20" cy="8" r=".5"/></svg>`;
        
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          showProbabilitiesForQuestion(index);
        });
        
        Object.assign(question.style, {
          position: 'relative'
        });
        
        question.appendChild(btn);
      });
    }

    function parseQuiz(questionIndex = 0) {
      const questions = document.querySelectorAll('div.que');
      if (questions.length === 0) {
        throw new Error('Question block not found.');
      }
      
      if (questionIndex >= questions.length) {
        throw new Error('Question index out of range.');
      }

      const q = questions[questionIndex];
      const qtext = q.querySelector('.qtext')?.innerText.trim() ?? '';
      const answerNode = q.querySelector('.answer');

      if (!answerNode) {
        return { qtext, options: [], qElem: q, questionType: null };
      }

      const firstInput = answerNode.querySelector('input:not([type="hidden"])');
      const inputId = firstInput ? firstInput.getAttribute('id') : '';
      let questionType;
      let options;

      if (inputId.includes('answertrue') || inputId.includes('answerfalse')) {
        questionType = 'tf';
        options = [];
      } else {
        questionType = 'mcq';
        const optionNodes = answerNode.querySelectorAll('div.r0, div.r1') ?? [];
        options = Array.from(optionNodes, n => n.querySelector('div > div > div > div')?.innerText.trim());
      }
      
      return { qtext, options, qElem: q, questionType };
    }
  
    async function getProbabilities(qtext, options, questionType) {
      const { apiKey, modelId, temperature, thinkingBudget } = await chrome.storage.sync.get(['apiKey', 'modelId', 'temperature', 'thinkingBudget']);
      if (!apiKey) {
        throw new Error('APIキーが設定されていません。拡張機能の設定からAPIキーを設定してください。');
      }

      let prompt;
      let responseSchema;

      if (questionType === 'tf') {
        prompt = `以下の文が正しいかの確率を0から1の間の数値で評価してください。0は完全に誤り、1は完全に正しいことを示します。\n\n文: ${qtext}`;
        responseSchema = {
          type: 'object',
          properties: {
            'correctness_probability': { type: 'number' }
          },
          required: ['correctness_probability']
        };
      } else {
        prompt = `以下の問題と選択肢について、それぞれの選択肢が正解である確率を0から1の間の数値で評価してください。\n\n問題: ${qtext}\n\n選択肢:\n${options.map((opt, i) => `${String.fromCharCode(97 + i)}. ${opt}`).join('\n')}`;
        responseSchema = {
          type: 'object',
          properties: Object.fromEntries(
            options.map((_, i) => [
              `option_${String.fromCharCode(97 + i)}`,
              { type: 'number' }
            ])
          )
        };
      }
      
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
            thinkingConfig: {
              thinkingBudget: thinkingBudget || 0,
            },
            responseMimeType: 'application/json',
            responseSchema: responseSchema
          }
        })
      });

      if (!response.ok) {
        throw new Error('APIリクエストに失敗しました');
      }

      const data = await response.json();
      const parsedResult = JSON.parse(data.candidates[0].content.parts[0].text);

      if (questionType === 'tf') {
        const correctnessProb = parsedResult.correctness_probability;
        return {
          'option_a': correctnessProb,
          'option_b': 1 - correctnessProb
        };
      } else {
        return parsedResult;
      }
    }

    function showProbabilityNextToQuestion(probabilities, qElem, questionType) {
      const old = qElem.querySelectorAll('.mqee-probability');
      old.forEach(e => e.remove());

      const answerNode = qElem.querySelector('.answer');
      if (!answerNode) return;

      const createSpan = (prob) => {
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
        return span;
      };

      if (questionType === 'tf') {
        const trueLabel = answerNode.querySelector('label[for$="answertrue"]');
        if (trueLabel && probabilities['option_a'] !== undefined) {
          trueLabel.appendChild(createSpan(probabilities['option_a']));
        }
        const falseLabel = answerNode.querySelector('label[for$="answerfalse"]');
        if (falseLabel && probabilities['option_b'] !== undefined) {
          falseLabel.appendChild(createSpan(probabilities['option_b']));
        }
      } else {
        const optionNodes = answerNode.querySelectorAll('div.r0, div.r1') ?? [];
        optionNodes.forEach((opt, i) => {
          const key = `option_${String.fromCharCode(97 + i)}`;
          const prob = probabilities[key];
          if (prob === undefined) return;

          const optTextElem = opt.querySelector('div > div > div > div');
          if (!optTextElem) return;
          optTextElem.appendChild(createSpan(prob));
        });
      }
    }

    function shouldRunOnCurrentPage() {
      const url = window.location.href;
      return url.includes('mod/quiz/attempt.php');
    }

    async function showProbabilitiesForQuestion(questionIndex) {
      try {
        const { qtext, options, qElem, questionType } = parseQuiz(questionIndex);
        const probabilities = await getProbabilities(qtext, options, questionType);
        showProbabilityNextToQuestion(probabilities, qElem, questionType);
        toast('確率を表示しました');
      } catch (err) {
        console.error(err);
        toast('エラー: ' + err.message);
      }
    }

    async function main() {
      if (!shouldRunOnCurrentPage()) return;

      setTimeout(() => {
        addProbabilityButtons();
      }, 1000);
    }

    window.addEventListener('DOMContentLoaded', () => {
      if (shouldRunOnCurrentPage()) {
        main();
      }
    });
  
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

    if (shouldRunOnCurrentPage()) {
      setTimeout(() => {
        addProbabilityButtons();
      }, 1000);
    }
  })();
