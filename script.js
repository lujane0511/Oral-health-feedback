console.log("✅ script.js 已成功載入！");

// ==========================================
// 1. 資料與全域變數
// ==========================================
const interData = {
    tip: { title: "刷牙前重要提示", text: "● 餐後等待：吃完東西等20-30分鐘再刷。<br>● 時間：每次至少2分鐘，每天至少2次。<br>● 牙膏：用含氟牙膏，不需過度漱口。" },
    denture: { title: "假牙清潔步驟", text: "● 餐後清潔：用餐後取下，用專用軟刷與清水刷洗。<br>● 忌用牙膏：避免研磨劑刮傷假牙。<br>● 定期浸泡：每2-3天用清潔錠泡5-15分鐘。<br>● 照護牙齦：沒真牙也要刷牙齦和上顎。" },
    floss: { title: "牙線棒使用教學", text: "● 輕柔滑入：左右移動慢慢滑進牙縫。<br>● C字型刮牙：緊貼牙齒面成C字，上下滑動。<br>● 分段清理：清完1-2個縫就沖洗或換新。" }
};

let currentSpeakingId = null;
let videoStream = null;
let allQuestions = [];        // 儲存所有題目
let currentQuizBatch = [];    // 目前這次測驗的題目
let currentQuestionIndex = 0;

// ==========================================
// 2. 語音功能
// ==========================================
function toggleSpeak(id, txt) {
    if (currentSpeakingId === id && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        currentSpeakingId = null;
        return;
    }
    window.speechSynthesis.cancel();
    const cleanTxt = txt.replace(/<br>/g, '、').replace(/●/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanTxt);
    utterance.lang = 'zh-TW';
    utterance.rate = 0.85;
    utterance.onend = () => { if (currentSpeakingId === id) currentSpeakingId = null; };
    window.speechSynthesis.speak(utterance);
    currentSpeakingId = id;
}

// ==========================================
// 3. 畫面切換控制
// ==========================================
function hideAllAreas() {
    document.getElementById('interactive-display').style.display = 'none';
    document.getElementById('quiz-display').style.display = 'none';
    document.getElementById('camera-display').style.display = 'none';
    stopCamera();
}

// ==========================================
// 4. 互動內容功能
// ==========================================
function showInteractive(key) {
    hideAllAreas();
    const area = document.getElementById('interactive-display');
    area.style.display = 'block';
    area.innerHTML = `<h3>${interData[key].title}</h3><p>${interData[key].text}</p>`;
    toggleSpeak(key, interData[key].title + "。" + interData[key].text);
}

function playBrushVideo() {
    hideAllAreas();
    const area = document.getElementById('interactive-display');
    area.style.display = 'block';
    area.innerHTML = `
        <h3>🪥 貝氏刷牙法示範影片</h3>
        <div class="video-container">
            <iframe src="https://www.youtube.com/embed/m1g4c0JhGBM?autoplay=1" frameborder="0" allowfullscreen></iframe>
        </div>
        <p>請看影片，跟著老師一起刷，每個地方刷10秒喔！</p>
    `;
    toggleSpeak('video', "那我們開始學習貝氏刷牙法囉！");
}

// ==========================================
// 5. 測驗系統（已優化為隨機10題）
// ==========================================
async function startQuiz() {
    window.speechSynthesis.cancel();
    hideAllAreas();
    document.getElementById('quiz-display').style.display = 'block';
    document.getElementById('ai-msg').innerText = "小測驗時間！讓我們來看看你記住了多少吧！";

    toggleSpeak('quiz_intro', "小測驗時間！讓我們來看看你記住了多少吧！");

    // 如果還沒載入題庫，就從 test.txt 讀取
    if (allQuestions.length === 0) {
        try {
            const response = await fetch('test.txt');
            const text = await response.text();
            parseQuestions(text);
        } catch (e) {
            document.getElementById('q-title').innerHTML = "無法載入題庫，請確認 test.txt 檔案存在！";
            return;
        }
    }

    // 隨機抽取 10 題（或全部如果少於10題）
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
    console.log(`✅ 已載入 ${allQuestions.length} 題測驗題目`);
}

function renderQuestion() {
    const q = currentQuizBatch[currentQuestionIndex];
    document.getElementById('q-feedback').style.display = 'none';
    document.getElementById('q-next').style.display = 'none';

    document.getElementById('q-title').innerText = `第 ${currentQuestionIndex + 1} 題 / ${currentQuizBatch.length} 題\n${q.question}`;

    const optionsEl = document.getElementById('q-options');
    optionsEl.innerHTML = '';

    q.options.forEach((opt, index) => {
        const letter = String.fromCharCode(65 + index); // A、B、C、D
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerText = `${letter}. ${opt}`;
        btn.onclick = () => checkAnswer(btn, letter, q.correct, q.options);
        optionsEl.appendChild(btn);
    });

    toggleSpeak('q', `第 ${currentQuestionIndex + 1} 題：${q.question}`);
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
    toggleSpeak('feedback', feedbackEl.innerText.replace(/<br>/g, ''));

    nextBtn.innerText = (currentQuestionIndex >= currentQuizBatch.length - 1) ? "🔄 重新測驗" : "下一題 ➡️";
    nextBtn.style.display = 'block';
}

function nextQuestion() {
    if (currentQuestionIndex >= currentQuizBatch.length - 1) {
        startQuiz(); // 重新開始
    } else {
        currentQuestionIndex++;
        renderQuestion();
    }
}

// ==========================================
// 6. 相機與 AI 分析
// ==========================================
async function openCameraUI() { /* ... 保持不變 ... */ }
function stopCamera() { /* ... 保持不變 ... */ }
function takePhoto() { /* ... 保持不變 ... */ }
function retakePhoto() { openCameraUI(); }

async function submitToGemini() {
    const preview = document.getElementById('photo-preview');
    const resultBox = document.getElementById('ai-result-box');
   
    resultBox.style.display = 'block';
    resultBox.innerHTML = `<div style="text-align:center;padding:20px;"><div class="loading-spinner"></div><br>⏳ AI 正在分析照片...</div>`;

    toggleSpeak('loading', "正在為您分析照片，請稍候。");

    const base64Image = preview.src.split(',')[1];

    const requestData = {
        contents: [{
            parts: [
                { text: "這是一張長者口腔照片，請用溫暖親切、鼓勵的語氣，用繁體中文詳細分析清潔狀況並給予實用建議。" },
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

        if (!response.ok || data.error) throw new Error(data.error?.message || "分析失敗");

        const aiText = data.candidates[0].content.parts[0].text;
        resultBox.innerHTML = `<strong>🤖 AI 助教分析：</strong><br><br>${aiText.replace(/\n/g, '<br>')}`;
        toggleSpeak('ai_result', aiText);

    } catch (error) {
        resultBox.innerHTML = `❌ 分析失敗<br><small style="color:red;">${error.message}</small>`;
    }
}
