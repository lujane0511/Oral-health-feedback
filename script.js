console.log("✅ script.js 已成功載入！");

// ==========================================
// 1. 資料與全域變數
// ==========================================
const interData = {
    tip: {
        title: "刷牙前重要提示",
        text: "● 餐後等待：吃完東西等20-30分鐘再刷。\n● 時間：每次至少2分鐘，每天至少2次。\n● 牙膏：用含氟牙膏，不需過度漱口。"
    },
    denture: {
        title: "假牙清潔步驟",
        text: "● 餐後清潔：用餐後取下，用專用軟刷與清水刷洗。\n● 忌用牙膏：避免研磨劑刮傷假牙。\n● 定期浸泡：每2-3天用清潔錠泡5-15分鐘。\n● 照護牙齦：沒真牙也要刷牙齦和上顎。"
    },
    floss: {
        title: "牙線棒使用教學",
        text: "● 輕柔滑入：左右移動慢慢滑進牙縫。\n● C字型刮牙：緊貼牙齒面成C字，上下滑動。\n● 分段清理：清完1-2個縫就沖洗或換新。"
    }
};

let currentSpeakingId = null;
let videoStream = null;

// 測驗系統變數
let allQuestions = [];
let currentQuizBatch = [];
let currentQuestionIndex = 0;

// ==========================================
// 2. 語音功能
// ==========================================
function toggleSpeak(id, txt) {
    if (currentSpeakingId === id && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        currentSpeakingId = null;
        updateSpeakButton(id, false);
        return;
    }
    
    window.speechSynthesis.cancel();
    // 清除換行與標點符號，讓語音更流暢
    const cleanTxt = txt.replace(/\n/g, '、').replace(/●/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanTxt);
    utterance.lang = 'zh-TW';
    utterance.rate = 0.85;
    
    utterance.onend = () => {
        if (currentSpeakingId === id) {
            currentSpeakingId = null;
            updateSpeakButton(id, false);
        }
    };
    
    window.speechSynthesis.speak(utterance);
    currentSpeakingId = id;
    updateSpeakButton(id, true);
}

function updateSpeakButton(id, isSpeaking) {
    const btn = document.getElementById(`speak-btn-${id}`);
    if (btn) {
        btn.innerHTML = isSpeaking ? '🔊' : '🔇';
        btn.title = isSpeaking ? '停止朗讀' : '開始朗讀';
        
        // 核心修正：動態切換 CSS 呼吸燈與美化樣式
        if (isSpeaking) {
            btn.classList.add('speaking');
        } else {
            btn.classList.remove('speaking');
        }
    }
}

// ==========================================
// 3. 畫面控制
// ==========================================
function hideAllAreas() {
    document.getElementById('interactive-display').style.display = 'none';
    document.getElementById('quiz-display').style.display = 'none';
    document.getElementById('camera-display').style.display = 'none';
    document.getElementById('interactive-display').removeAttribute('data-current');
    stopCamera();
    window.speechSynthesis.cancel();
    currentSpeakingId = null;
}

// ==========================================
// 4. 互動內容（點擊只顯示，不自動朗讀）
// ==========================================
function showInteractive(key) {
    const area = document.getElementById('interactive-display');
    if (area.style.display === 'block' && area.getAttribute('data-current') === key) {
        hideAllAreas();
        return;
    }
    hideAllAreas();
    area.style.display = 'block';
    area.setAttribute('data-current', key);
    
    // 核心修正：加入 class="speak-btn" 連結 CSS 樣式，並修正引號與傳參
    const textForSpeak = interData[key].text.replace(/"/g, '&quot;');
    area.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
            <h3 style="margin: 0; color: var(--primary);">${interData[key].title}</h3>
            <button id="speak-btn-${key}" class="speak-btn" title="開始朗讀" onclick="toggleSpeak('${key}', '${textForSpeak}')">🔇</button>
        </div>
        <div style="white-space: pre-line; line-height: 1.8;">${interData[key].text}</div>
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
    
    // 核心修正：加入 class="speak-btn" 連結 CSS 樣式
    area.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
            <h3 style="margin: 0; color: var(--primary);">🪥 貝氏刷牙法示範影片</h3>
            <button id="speak-btn-video" class="speak-btn" title="開始朗讀" onclick="toggleSpeak('video', '${videoIntro}')">🔇</button>
        </div>
        <div class="video-container">
            <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" frameborder="0" allowfullscreen></iframe>
        </div>
        <p style="margin-top: 10px; font-weight: bold;">${videoIntro}</p>
    `;
}

// ==========================================
// 5. 測驗系統
// ==========================================
async function startQuiz() {
    const quizArea = document.getElementById('quiz-display');
    if (quizArea.style.display === 'block') {
        hideAllAreas();
        return;
    }
    hideAllAreas();
    quizArea.style.display = 'block';
    document.getElementById('ai-msg').innerText = "小測驗時間！讓我們來看看你記住了多少吧！";
    
    if (allQuestions.length === 0) {
        try {
            const response = await fetch('test.txt');
            const text = await response.text();
            parseQuestions(text);
        } catch (e) {
            document.getElementById('q-title').innerHTML = "無法載入題庫，請確認 test.txt 存在！";
            return;
        }
    }
    
    let shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
    currentQuizBatch = shuffled.slice(0, 10);
    currentQuestionIndex = 0;
    renderQuestion();
}

function parseQuestions(text) {
    allQuestions = [];
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    let i = 0;
    while (i < lines.length) {
        if (lines[i].match(/^\d+\./)) {
            const question = lines[i].substring(lines[i].indexOf('.') + 1).trim();
            const options = [lines[i+1], lines[i+2], lines[i+3], lines[i+4]];
            const answerMatch = (lines[i+5] || "").match(/[A-D]/);
            if (answerMatch && options.length === 4) {
                allQuestions.push({
                    question: question,
                    options: options,
                    correct: answerMatch[0]
                });
            }
            i += 6;
        } else {
            i++;
        }
    }
    console.log(`✅ 已載入 ${allQuestions.length} 題`);
}

function renderQuestion() {
    const q = currentQuizBatch[currentQuestionIndex];
    document.getElementById('q-feedback').style.display = 'none';
    document.getElementById('q-next').style.display = 'none';
    document.getElementById('q-title').innerText = `第 ${currentQuestionIndex + 1} 題 / ${currentQuizBatch.length} 題\n${q.question}`;
    
    const optionsEl = document.getElementById('q-options');
    optionsEl.innerHTML = '';
    
    q.options.forEach((opt, index) => {
        const letter = String.fromCharCode(65 + index);
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerText = `${letter}. ${opt}`;
        btn.onclick = () => checkAnswer(btn, letter, q.correct, q.options);
        optionsEl.appendChild(btn);
    });
}

function checkAnswer(selectedBtn, selectedLetter, correctLetter, allOptions) {
    window.speechSynthesis.cancel();
    const allBtns = document.querySelectorAll('.option-btn');
    allBtns.forEach(btn => btn.disabled = true);
    
    const feedbackEl = document.getElementById('q-feedback');
    const nextBtn = document.getElementById('q-next');
    const correctIndex = correctLetter.charCodeAt(0) - 65;
    
    if (selectedLetter === correctLetter) {
        selectedBtn.classList.add('correct');
        feedbackEl.style.background = '#d4edda';
        feedbackEl.style.color = '#155724';
        feedbackEl.innerHTML = "🎉 答對了！非常棒！";
    } else {
        selectedBtn.classList.add('wrong');
        allBtns[correctIndex].classList.add('correct');
        feedbackEl.style.background = '#f8d7da';
        feedbackEl.style.color = '#721c24';
        feedbackEl.innerHTML = `❌ 答錯了<br>正確答案是：${allOptions[correctIndex]}`;
    }
    
    feedbackEl.style.display = 'block';
    nextBtn.innerText = (currentQuestionIndex >= currentQuizBatch.length - 1) ? "🔄 重新測驗" : "下一題 ➡️";
    nextBtn.style.display = 'block';
}

function nextQuestion() {
    if (currentQuestionIndex >= currentQuizBatch.length - 1) {
        startQuiz();
    } else {
        currentQuestionIndex++;
        renderQuestion();
    }
}

// ==========================================
// 6. 相機與 AI 分析
// ==========================================
async function openCameraUI() {
    const cameraArea = document.getElementById('camera-display');
    if (cameraArea.style.display === 'block') {
        hideAllAreas();
        return;
    }
    hideAllAreas();
    cameraArea.style.display = 'block';
    document.getElementById('ai-msg').innerText = "請將鏡頭對準口腔，按下拍照鈕進行分析。";
    document.getElementById('ai-result-box').style.display = 'none';
    document.getElementById('camera-container').style.display = 'block';
    document.getElementById('preview-container').style.display = 'none';
    
    try {
        const video = document.getElementById('video-stream');
        videoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
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

async function submitToGemini() {
    const preview = document.getElementById('photo-preview');
    const resultBox = document.getElementById('ai-result-box');
    resultBox.style.display = 'block';
    
    resultBox.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <div class="loading-spinner"></div>
            <div>⏳ AI 助教正在分析您的口腔照片，請稍候...</div>
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
        // 將換行符號轉成 HTML 換行
        resultBox.innerHTML = `<strong>🤖 AI 助教分析：</strong><br><br>${aiText.replace(/\n/g, '<br>')}`;
    } catch (error) {
        console.error("分析錯誤：", error);
        resultBox.innerHTML = `<span style="color: var(--danger);">❌ 分析失敗：${error.message}</span>`;
    }
}
