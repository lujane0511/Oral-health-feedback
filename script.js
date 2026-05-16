// ==========================================
// API 設定
// ==========================================
const GEMINI_API_KEY = "AIzaSyDOMLfds9bdvS3BBEHGTxW0lDCDI-Rz7wg";

// 口腔衛教互動資料
const interData = {
    tip: { 
        title: "刷牙前重要提示", 
        text: "● 餐後等待：吃完東西等20-30分鐘再刷。<br>● 時間：每次至少2分鐘，每天至少2次。<br>● 牙膏：用含氟牙膏，不需過度漱口。" 
    },
    denture: { 
        title: "假牙清潔步驟", 
        text: "● 餐後清潔：用餐後取下，用專用軟刷與清水刷洗。<br>● 忌用牙膏：避免研磨劑刮傷假牙。<br>● 定期浸泡：每2-3天用清潔錠泡5-15分鐘。<br>● 照護牙齦：沒真牙也要刷牙齦和上顎。" 
    },
    floss: { 
        title: "牙線棒使用教學", 
        text: "● 輕柔滑入：左右移動慢慢滑進牙縫。<br>● C字型刮牙：緊貼牙齒面成C字，上下滑動。<br>● 分段清理：清完1-2個縫就沖洗或換新。" 
    }
};

let currentSpeakingId = null;
let videoStream = null;

// ==========================================
// 語音功能
// ==========================================
function toggleSpeak(id, txt) {
    if (currentSpeakingId === id && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        currentSpeakingId = null;
        return;
    }
    window.speechSynthesis.cancel();
    const cleanTxt = txt.replace(/<br>/g, '、').replace(/●/g, '');
    const s = new SpeechSynthesisUtterance(cleanTxt);
    s.lang = 'zh-TW';
    s.rate = 0.85;
    s.onend = () => { if (currentSpeakingId === id) currentSpeakingId = null; };
    window.speechSynthesis.speak(s);
    currentSpeakingId = id;
}

// ==========================================
// 畫面切換
// ==========================================
function hideAllAreas() {
    document.getElementById('interactive-display').style.display = 'none';
    document.getElementById('quiz-display').style.display = 'none';
    document.getElementById('camera-display').style.display = 'none';
    stopCamera();
}

function toggleSection(id) {
    const el = document.getElementById(id);
    const isVisible = el.style.display === 'block';
    
    if (isVisible) {
        el.style.display = 'none';
        window.speechSynthesis.cancel();
        currentSpeakingId = null;
    } else {
        document.querySelectorAll('.section-content').forEach(s => s.style.display = 'none');
        el.style.display = 'block';
        toggleSpeak(id, el.innerText);
    }
}

// ==========================================
// 互動內容
// ==========================================
function showInteractive(key) {
    hideAllAreas();
    const area = document.getElementById('interactive-display');
    area.style.display = 'block';
    area.innerHTML = `<h3>${interData[key].title}</h3><p>${interData[key].text}</p>`;
    document.getElementById('ai-msg').innerText = "助教正在說明：" + interData[key].title;
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
        <p>請看影片，牙刷斜斜45度，跟著老師一起刷，每個地方刷10秒喔！</p>
    `;
    document.getElementById('ai-msg').innerText = "助教導引中：貝氏刷牙示範";
    toggleSpeak('video', "那我們開始學習貝氏刷牙法囉！請看著影片跟著老師一起刷，每個地方都要刷乾淨喔。");
}

// ==========================================
// 測驗系統
// ==========================================
let allQuestions = [];
let currentQuizBatch = [];
let currentQuestionIndex = 0;

async function startQuiz() {
    window.speechSynthesis.cancel();
    currentSpeakingId = null;
    hideAllAreas();
    document.getElementById('quiz-display').style.display = 'block';
    document.getElementById('ai-msg').innerText = "小測驗時間！讓我們來看看記得了多少吧！";
    toggleSpeak('quiz_intro', "小測驗時間！讓我們來看看記得了多少吧！");

    if (allQuestions.length === 0) {
        try {
            const response = await fetch('test.txt');
            const text = await response.text();
            parseQuestions(text);
        } catch (error) {
            document.getElementById('q-title').innerHTML = "無法讀取題庫！<br><small style='color:red;'>注意：此功能需上傳至伺服器才能運作。</small>";
            return;
        }
    }
    let shuffled = allQuestions.sort(() => 0.5 - Math.random());
    currentQuizBatch = shuffled.slice(0, 5);
    currentQuestionIndex = 0;
    renderQuestion();
}

function parseQuestions(text) {
    allQuestions = [];
    const lines = text.split('\n').map(l => l.trim()).filter(l => l !== '');
    let i = 0;
    while (i < lines.length) {
        if (lines[i].match(/^\d+\./)) {
            let qText = lines[i].substring(lines[i].indexOf('.') + 1).trim();
            let options = [lines[i+1], lines[i+2], lines[i+3], lines[i+4]];
            let ansMatch = (lines[i+5] || "").match(/[A-D]/);
            if (ansMatch && options.length === 4) {
                allQuestions.push({ 
                    question: qText, 
                    options: options, 
                    correctOptionLetter: ansMatch[0] 
                });
            }
            i += 6;
        } else { 
            i++; 
        }
    }
}

function renderQuestion() {
    const qData = currentQuizBatch[currentQuestionIndex];
    document.getElementById('q-feedback').style.display = 'none';
    document.getElementById('q-next').style.display = 'none';
    
    const optionsEl = document.getElementById('q-options');
    optionsEl.innerHTML = '';
   
    document.getElementById('q-title').innerText = `第 ${currentQuestionIndex + 1} 題 (共5題)：\n${qData.question}`;
    toggleSpeak('q_' + currentQuestionIndex, `第 ${currentQuestionIndex + 1} 題：${qData.question}`);

    qData.options.forEach((optText, index) => {
        const letter = String.fromCharCode(65 + index);
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerText = optText;
        btn.onclick = () => checkAnswer(btn, letter, qData.correctOptionLetter, qData.options);
        optionsEl.appendChild(btn);
    });
}

function checkAnswer(selectedBtn, selectedLetter, correctLetter, allOptionsText) {
    window.speechSynthesis.cancel();
    const allBtns = document.querySelectorAll('.option-btn');
    const feedbackEl = document.getElementById('q-feedback');
    const nextBtn = document.getElementById('q-next');

    allBtns.forEach(btn => btn.disabled = true);

    const correctIndex = correctLetter.charCodeAt(0) - 65;
    let feedbackText = "";

    if (selectedLetter === correctLetter) {
        selectedBtn.classList.add('correct');
        feedbackEl.style.background = '#d4edda';
        feedbackEl.style.color = '#155724';
        feedbackText = "🎉 答題正確！非常棒！";
    } else {
        selectedBtn.classList.add('wrong');
        allBtns[correctIndex].classList.add('correct');
        feedbackEl.style.background = '#f8d7da';
        feedbackEl.style.color = '#721c24';
        feedbackText = `❌ 答錯了喔！<br>正確答案是：<br>${allOptionsText[correctIndex]}`;
    }

    feedbackEl.innerHTML = feedbackText;
    feedbackEl.style.display = 'block';
    toggleSpeak('feedback', feedbackText.replace(/<br>/g, ''));
    
    nextBtn.innerText = currentQuestionIndex >= currentQuizBatch.length - 1 ? "🔄 測驗結束，重新測驗" : "下一題 ➡️";
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
// 相機與 Gemini AI 分析（已修正）
// ==========================================
async function openCameraUI() {
    hideAllAreas();
    document.getElementById('camera-display').style.display = 'block';
    document.getElementById('ai-msg').innerText = "請將鏡頭對準口腔，按下拍照鈕進行分析。";
    document.getElementById('ai-result-box').style.display = 'none';
   
    document.getElementById('camera-container').style.display = 'block';
    document.getElementById('preview-container').style.display = 'none';

    toggleSpeak('camera_intro', "請將鏡頭對準口腔，拍好照片後送出，讓我為您分析清潔狀況。");

    try {
        const video = document.getElementById('video-stream');
        videoStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }
        });
        video.srcObject = videoStream;
    } catch (err) {
        alert("無法開啟相機，請確認設備權限。\n錯誤: " + err.message);
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
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    preview.src = dataUrl;

    document.getElementById('camera-container').style.display = 'none';
    document.getElementById('preview-container').style.display = 'block';
   
    stopCamera();
}

function retakePhoto() {
    openCameraUI();
}

// ====================【重點修正】====================
async function submitToGemini() {
    const preview = document.getElementById('photo-preview');
    const resultBox = document.getElementById('ai-result-box');
   
    resultBox.style.display = 'block';
    resultBox.innerHTML = `
        <div style="text-align: center;">
            <div class="loading-spinner"></div><br>
            ⏳ AI 助教正在分析照片，請稍候...
        </div>
    `;
    toggleSpeak('loading', "正在為您分析照片，請稍候。");

    const base64Image = preview.src.split(',')[1];

    const requestData = {
        contents: [{
            parts: [
                { 
                    text: "這是一張長者口腔照片，請用溫暖親切的語氣，用繁體中文分析清潔狀況、可能問題，並給予實用改善建議。" 
                },
                {
                    inlineData: {
                        mimeType: "image/jpeg",
                        data: base64Image
                    }
                }
            ]
        }]
    };

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData)
            }
        );

        const data = await response.json();

        if (!response.ok || data.error) {
            throw new Error(data.error?.message || `HTTP 錯誤 ${response.status}`);
        }

        const aiText = data.candidates[0].content.parts[0].text;
       
        resultBox.innerHTML = `
            <strong>🤖 AI 助教分析：</strong><br><br>
            ${aiText.replace(/\n/g, '<br>')}
        `;
        toggleSpeak('ai_result', aiText);

    } catch (error) {
        console.error("API 錯誤：", error);
        resultBox.innerHTML = `
            ❌ 分析失敗<br>
            <small style="color:red;">錯誤原因：${error.message}</small><br>
            <small>請確認網路連線或稍後再試。</small>
        `;
        toggleSpeak('ai_error', "分析失敗，請稍後再試。");
    }
}
