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
    hideAllAreas();
    const area = document.getElementById('interactive-display');
    area.style.display = 'block';
    area.innerHTML = `<h3>${interData[key].title}</h3><p>${interData[key].text}</p>`;
    toggleSpeak(key, interData[key].title + "。" + interData[key].text);
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
// 相機與 AI 分析功能（重點）
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
    resultBox.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <div class="loading-spinner"></div><br>
            ⏳ AI 助教正在分析您的口腔照片，請稍候...
        </div>
    `;

    toggleSpeak('loading', "正在為您分析照片，請稍候。");

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
        
        resultBox.innerHTML = `<strong>🤖 AI 助教分析：</strong><br><br>${aiText.replace(/\n/g, '<br>')}`;
        toggleSpeak('ai_result', aiText);

    } catch (error) {
        console.error("分析錯誤：", error);
        resultBox.innerHTML = `❌ 分析失敗<br><small style="color:red;">${error.message}</small>`;
    }
}
