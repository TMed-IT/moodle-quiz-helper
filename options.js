document.addEventListener('DOMContentLoaded', () => {
  // 保存された設定を読み込む
  chrome.storage.sync.get(['apiKey', 'modelId', 'temperature'], (result) => {
    document.getElementById('apiKey').value = result.apiKey || '';
    document.getElementById('modelId').value = result.modelId || 'gemini-2.0-flash';
    document.getElementById('temperature').value = result.temperature || 0;
    updateTemperatureValue(result.temperature || 0);
  });

  // Temperatureスライダーの値が変更されたときの処理
  const temperatureSlider = document.getElementById('temperature');
  temperatureSlider.addEventListener('input', (e) => {
    updateTemperatureValue(e.target.value);
  });

  // 保存ボタンのイベントリスナー
  document.getElementById('save').addEventListener('click', () => {
    const apiKey = document.getElementById('apiKey').value.trim();
    const modelId = document.getElementById('modelId').value.trim();
    const temperature = parseFloat(document.getElementById('temperature').value);

    if (!apiKey) {
      showStatus('APIキーを入力してください', 'error');
      return;
    }

    if (!modelId) {
      showStatus('モデルIDを入力してください', 'error');
      return;
    }

    // 保存中のアニメーション
    const saveButton = document.getElementById('save');
    const originalText = saveButton.innerHTML;
    saveButton.innerHTML = `
      <svg class="animate-spin" width="16" height="16" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      保存中...
    `;
    saveButton.disabled = true;

    chrome.storage.sync.set({
      apiKey,
      modelId,
      temperature
    }, () => {
      setTimeout(() => {
        saveButton.innerHTML = originalText;
        saveButton.disabled = false;
        showStatus('設定を保存しました', 'success');
      }, 500);
    });
  });
});

function updateTemperatureValue(value) {
  const temperatureValue = document.querySelector('.temperature-value');
  temperatureValue.textContent = parseFloat(value).toFixed(1);
}

function showStatus(message, type) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = `status ${type}`;
  status.style.display = 'block';
  
  // アニメーションをリセット
  status.style.animation = 'none';
  status.offsetHeight; // リフロー
  status.style.animation = 'fadeIn 0.3s ease';
  
  setTimeout(() => {
    status.style.display = 'none';
  }, 3000);
} 