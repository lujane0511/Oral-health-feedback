console.log("✅ script.js 已成功載入！");
// ====================【使用 Cloudflare Proxy - 已安全】====================
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
                { 
                    text: "這是一張長者口腔照片，請用溫暖親切、鼓勵的語氣，用繁體中文詳細分析清潔狀況、可能問題，並給予簡單實用的改善建議。" 
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
        // 使用你的 Cloudflare Worker Proxy
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
        
        resultBox.innerHTML = `
            <strong>🤖 AI 助教分析：</strong><br><br>
            ${aiText.replace(/\n/g, '<br>')}
        `;
        toggleSpeak('ai_result', aiText);

    } catch (error) {
        console.error("分析錯誤：", error);
        resultBox.innerHTML = `
            ❌ 分析失敗<br><br>
            <small style="color:red;">${error.message}</small><br>
            <small>請稍後再試一次</small>
        `;
    }
}
