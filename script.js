console.log("✅ script.js 已成功載入！");

// ==========================================
// API 設定
// ==========================================
const GEMINI_API_KEY = "你的新Key";   // 如果還沒換成新的，請先換

// 互動內容資料
const interData = {
    tip: { title: "刷牙前重要提示", text: "● 餐後等待：吃完東西等20-30分鐘再刷。<br>● 時間：每次至少2分鐘，每天至少2次。<br>● 牙膏：用含氟牙膏，不需過度漱口。" },
    denture: { title: "假牙清潔步驟", text: "● 餐後清潔：用餐後取下，用專用軟刷與清水刷洗。<br>● 忌用牙膏：避免研磨劑刮傷假牙。<br>● 定期浸泡：每2-3天用清潔錠泡5-15分鐘。<br>● 照護牙齦：沒真牙也要刷牙齦和上顎。" },
    floss: { title: "牙線棒使用教學", text: "● 輕柔滑入：左右移動慢慢滑進牙縫。<br>● C字型刮牙：緊貼牙齒面成C字，上下滑動。<br>● 分段清理：清完1-2個縫就沖洗或換新。" }
};

let currentSpeakingId = null;
let videoStream = null;

// ==========================================
// 語音功能
// ==========================================
function toggleSpeak(id, txt) {
    const btn = document.getElementById('speak-btn-' + id);

    // 如果目前正在朗讀，且點擊的是同一個按鈕，則停止朗讀
    if (currentSpeakingId === id && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        currentSpeakingId = null;
        if (btn) btn.classList.remove('speaking'); // 移除閃爍動畫
        return;
    }
    
    // 否則，先停止所有正在進行的語音
    window.speechSynthesis.cancel();
    
    // 移除畫面上所有朗讀按鈕的動畫狀態
    document.querySelectorAll('.speak-btn').forEach(b => b.classList.remove('speaking'));

    const cleanTxt = txt.replace(/<br>/g, '、').replace(/●/g, '');
    const s = new SpeechSynthesisUtterance(cleanTxt);
    s.lang = 'zh-TW';
    s.rate = 0.85;
    
    // 當開始朗讀時，加上按鈕特效
    s.onstart = () => {
        if (btn) btn.classList.add('speaking');
    };

    // 當朗讀結束時，清除按鈕特效與狀態
    s.onend = () => { 
        if (currentSpeakingId === id) {
            currentSpeakingId = null; 
            if (btn) btn.classList.remove('speaking');
        }
    };
    
    window.speechSynthesis.speak(s);
    currentSpeakingId = id;
}

// ==========================================
// 畫面控制
// ==========================================
function hideAllAreas() {
    document.getElementById('interactive-display').style.display = 'none';
    document.getElementById('quiz-display').style.display = 'none';
    document.getElementById('camera-display').style.display = 'none';
    stopCamera();
}

// ==========================================
// 互動功能
// ==========================================
function showInteractive(key) {
    const area = document.getElementById('interactive-display');

    // 【新增】檢查是否已經開啟這個區塊，如果已經開啟，再按一次主選單按鈕就會關閉
    if (area.style.display === 'block' && area.getAttribute('data-current') === key) {
        hideAllAreas();
        window.speechSynthesis.cancel(); // 關閉畫面的同時，把語音也停掉
        currentSpeakingId = null;
        return;
    }

    // 如果還沒開啟，就先隱藏所有畫面，然後顯示這一個
    hideAllAreas();
    area.style.display = 'block';
    area.setAttribute('data-current', key); // 記住目前顯示的是哪一個功能 (tip, denture, 或 floss)

    // 切換頁面時，自動停止任何尚未結束的語音
    window.speechSynthesis.cancel();
    currentSpeakingId = null;

    const title = interData[key].title;
    const text = interData[key].text;
    const speakText = title + "。" + text;

    // 渲染內容：包含獨立的朗讀按鈕，且「不會」自動觸發語音
    area.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
            <h3 style="margin: 0; color: var(--primary);">${title}</h3>
            <button id="speak-btn-${key}" class="speak-btn" title="朗讀 / 停止" onclick="toggleSpeak('${key}', '${speakText}')">🔊</button>
        </div>
        <p>${text}</p>
    `;
}

function playBrushVideo() {
    const area = document.getElementById('interactive-display');
    if (area.style.display === 'block' && area.getAttribute('data-current') === 'video') {
        hideAllAreas();
        return;
    }
    hideAllAreas();
    area.style.display = 'block';
    area.setAttribute('data-current', 'video');
    
    const videoIntro = "請看影片，跟著老師一起刷，每個地方刷10秒喔！";
    
    // 核心修正：加入 class="speak-btn" 連結 CSS 樣式，並更新為新的 YouTube 影片連結
    area.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
            <h3 style="margin: 0; color: var(--primary);">🪥 貝氏刷牙法示範影片</h3>
            <button id="speak-btn-video" class="speak-btn" title="開始朗讀" onclick="toggleSpeak('video', '${videoIntro}')">🔇</button>
        </div>
        <div class="video-container">
            <!-- 這裡已經幫你替換成新的貝氏刷牙法影片連結 -->
            <iframe src="https://www.youtube.com/embed/m1g4c0JhGBM" frameborder="0" allowfullscreen></iframe>
        </div>
        <p style="margin-top: 10px; font-weight: bold;">${videoIntro}</p>
    `;
}

// ==========================================
// 相機與 AI 分析功能
// ==========================================
async function openCameraUI() {
    const area = document.getElementById('camera-display');

    // 【新增】再按一次按鈕即關閉畫面與語音
    if (area.style.display === 'block') {
        hideAllAreas();
        window.speechSynthesis.cancel();
        currentSpeakingId = null;
        return;
    }

    hideAllAreas();
    area.style.display = 'block';
    document.getElementById('ai-msg').innerText = "請將鏡頭對準口腔，按下拍照鈕進行分析。";
    document.getElementById('ai-result-box').style.display = 'none';

    document.getElementById('camera-container').style.display = 'block';
    document.getElementById('preview-container').style.display = 'none';

    // 關閉先前的語音，不自動播放
    window.speechSynthesis.cancel();
    currentSpeakingId = null;

    // 動態將朗讀按鈕加入相機區塊的標題
    const titleEl = document.querySelector('.camera-title');
    const introText = "請將鏡頭對準口腔，拍好照片後送出，讓我為您分析清潔狀況。";
    titleEl.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <span>📷 口腔清潔度 AI 分析</span>
            <button id="speak-btn-camera" class="speak-btn" title="朗讀 / 停止" onclick="toggleSpeak('camera', '${introText}')">🔊</button>
        </div>
    `;

    try {
        const video = document.getElementById('video-stream');
        videoStream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } 
        });
        video.srcObject = videoStream;
    } catch (err) {
        alert("無法開啟相機，請確認權限。\n錯誤: " + err.message);
    }
}

function stopCamera() {
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }
}

function takePhoto() {
    const video = document.getElementById('video-stream');
    const canvas = document.getElementById('photo-canvas');
    const preview = document.getElementById('photo-preview');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);

    preview.src = canvas.toDataURL('image/jpeg', 0.85);
    document.getElementById('camera-container').style.display = 'none';
    document.getElementById('preview-container').style.display = 'block';
    stopCamera();
}

function retakePhoto() {
    openCameraUI();
}

// ==================== 使用 Cloudflare Worker Proxy ====================
async function submitToGemini() {
    const preview = document.getElementById('photo-preview');
    const resultBox = document.getElementById('ai-result-box');
    
    resultBox.style.display = 'block';
    // 移除讀取時的自動語音
    resultBox.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <div class="loading-spinner"></div><br>
            ⏳ AI 助教正在分析您的口腔照片，請稍候...
        </div>
    `;

    const base64Image = preview.src.split(',')[1];

    const requestData = {
        contents: [{
            parts: [
                { text: "這是一張長者口腔照片，請用溫暖親切、鼓勵的語氣，用繁體中文詳細分析清潔狀況、可能問題，並給予簡單實用的改善建議。" },
                { inlineData: { mimeType: "image/jpeg", data: base64Image } }
            ]
        }]
    };

    try {
       const proxyUrl = "https://withered-boat-fb8a.lujane0511.workers.dev/v1beta/models/gemini-2.5-flash:generateContent";

        const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });

        const data = await response.json();

        if (!response.ok || data.error) {
            throw new Error(data.error?.message || `HTTP 錯誤 ${response.status}`);
        }

        const aiText = data.candidates[0].content.parts[0].text;
        
        // 渲染結果並加上專屬的 AI 朗讀按鈕
        resultBox.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <strong style="font-size: 1.2rem;">🤖 AI 助教分析：</strong>
                <button id="speak-btn-ai" class="speak-btn" title="朗讀 / 停止">🔊</button>
            </div>
            <div>${aiText.replace(/\n/g, '<br>')}</div>
        `;
        
        // 為了避免 AI 產生的文字裡有引號破壞 HTML，使用 onClick 綁定事件
        document.getElementById('speak-btn-ai').onclick = () => toggleSpeak('ai', aiText);

    } catch (error) {
        console.error("分析錯誤：", error);
        resultBox.innerHTML = `❌ 分析失敗<br><small style="color:red;">${error.message}</small>`;
    }
}

// ==========================================
// 測驗功能 (Quiz)
// ==========================================
const quizData = [
    { q: "刷牙的最佳時機是？", options: ["吃完東西立刻刷", "餐後等待20-30分鐘", "只有睡前需要刷"], ans: 1 },
    { q: "假牙可以使用一般牙膏刷洗嗎？", options: ["可以，這樣才乾淨", "不可以，會刮傷假牙", "看心情決定"], ans: 1 },
    { q: "牙線棒正確的使用方式是？", options: ["用力壓入牙縫", "緊貼牙齒面成C字型上下滑動", "隨便剔一剔就好"], ans: 1 }
];

let currentQIndex = 0;

function startQuiz() {
    const area = document.getElementById('quiz-display');

    // 【新增】再按一次按鈕即關閉畫面與語音
    if (area.style.display === 'block') {
        hideAllAreas();
        window.speechSynthesis.cancel();
        currentSpeakingId = null;
        return;
    }

    hideAllAreas();
    area.style.display = 'block';
    currentQIndex = 0;
    
    // 關閉語音，不自動播放
    window.speechSynthesis.cancel();
    currentSpeakingId = null;
    
    showQuestion();
}

function showQuestion() {
    const qObj = quizData[currentQIndex];
    const qTitle = document.getElementById('q-title');
    const qOptions = document.getElementById('q-options');
    const qFeedback = document.getElementById('q-feedback');
    const qNext = document.getElementById('q-next');

    qFeedback.style.display = 'none';
    qNext.style.display = 'none';

    // 組合要朗讀的文字：包含題目和選項
    let speakText = "題目：" + qObj.q + "。選項有：";
    qObj.options.forEach((opt, i) => { 
        speakText += `第${i+1}個，${opt}。`; 
    });

    // 渲染題目，並在右側加入朗讀按鈕
    qTitle.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <span>第 ${currentQIndex + 1} 題：${qObj.q}</span>
            <button id="speak-btn-quiz" class="speak-btn" title="朗讀 / 停止" onclick="toggleSpeak('quiz', '${speakText}')">🔊</button>
        </div>
    `;

    qOptions.innerHTML = '';
    qObj.options.forEach((opt, index) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerText = opt;
        btn.onclick = () => checkAnswer(index, btn);
        qOptions.appendChild(btn);
    });
}

function checkAnswer(selectedIndex, btnElement) {
    const qObj = quizData[currentQIndex];
    const qFeedback = document.getElementById('q-feedback');
    const qNext = document.getElementById('q-next');
    const allOptions = document.querySelectorAll('.option-btn');

    // 停止語音
    window.speechSynthesis.cancel();
    currentSpeakingId = null;

    allOptions.forEach(btn => btn.disabled = true);

    if (selectedIndex === qObj.ans) {
        btnElement.classList.add('correct');
        qFeedback.innerHTML = "✅ 答對了！非常棒！";
        qFeedback.style.color = "var(--success)";
    } else {
        btnElement.classList.add('wrong');
        allOptions[qObj.ans].classList.add('correct');
        qFeedback.innerHTML = "❌ 答錯了喔，正確答案是：" + qObj.options[qObj.ans];
        qFeedback.style.color = "var(--danger)";
    }

    qFeedback.style.display = 'block';
    
    if (currentQIndex < quizData.length - 1) {
        qNext.innerText = "下一題 ➡️";
    } else {
        qNext.innerText = "測驗完成！點擊收起";
    }
    qNext.style.display = 'block';
}

function nextQuestion() {
    if (currentQIndex < quizData.length - 1) {
        currentQIndex++;
        showQuestion();
    } else {
        hideAllAreas();
    }
}
