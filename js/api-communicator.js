document.addEventListener('DOMContentLoaded', function() {
    const sendToAiButton = document.getElementById('sendToAiButton');
    const aiHtmlResponseContainer = document.getElementById('aiHtmlResponseContainer');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const aiErrorStatus = document.getElementById('aiErrorStatus');
    const apiKeyInputSection = document.getElementById('apiKeyInputSection');
    const apiKeyInput = document.getElementById('apiKeyInput');
    const saveApiKeyButton = document.getElementById('saveApiKeyButton');
    const clearApiKeyButton = document.getElementById('clearApiKeyButton');
    const apiKeyStatusMessage = document.getElementById('apiKeyStatusMessage');

    if (!sendToAiButton || !aiHtmlResponseContainer || !loadingSpinner || !aiErrorStatus ||
        !apiKeyInputSection || !apiKeyInput || !saveApiKeyButton || !clearApiKeyButton || !apiKeyStatusMessage) {
        console.error("Một hoặc nhiều element liên quan đến API không tìm thấy!");
        if(sendToAiButton) sendToAiButton.disabled = true; // Vô hiệu hóa nút nếu thiếu element
        return;
    }

    let geminiApiKey = '';
    let promptContent = '';

    async function initializeApiKey() {
        let keyFound = false;
        try {
            const response = await fetch('api.txt'); // Giả sử api.txt cùng cấp với index.html
            if (response.ok) {
                const fileContent = await response.text();
                const trimmedContent = fileContent.trim();
                if (trimmedContent) {
                    geminiApiKey = trimmedContent;
                    apiKeyInputSection.style.display = 'none';
                    apiKeyStatusMessage.textContent = 'API Key đã được tải từ api.txt.';
                    apiKeyStatusMessage.classList.remove('api-key-not-saved-message');
                    keyFound = true;
                }
            }
        } catch (error) {
            console.warn('Không thể tải api.txt, thử kiểm tra localStorage:', error);
        }

        if (!keyFound) {
            const storedKey = localStorage.getItem('geminiApiKey');
            if (storedKey) {
                geminiApiKey = storedKey;
                apiKeyInputSection.style.display = 'none';
                apiKeyStatusMessage.textContent = 'API Key đã được lưu (từ trình duyệt).';
                apiKeyStatusMessage.classList.remove('api-key-not-saved-message');
                keyFound = true;
            }
        }

        if (!keyFound) {
            apiKeyInputSection.style.display = 'block';
            apiKeyStatusMessage.textContent = 'API Key chưa được tìm thấy. Vui lòng nhập và lưu.';
            apiKeyStatusMessage.classList.add('api-key-not-saved-message');
            apiKeyInput.value = '';
            apiKeyInput.disabled = false;
            if(saveApiKeyButton) saveApiKeyButton.disabled = false;
        } else {
             if(saveApiKeyButton) saveApiKeyButton.disabled = true; // Nếu key đã có, vô hiệu hóa nút lưu
        }
    }

    if (saveApiKeyButton) {
        saveApiKeyButton.addEventListener('click', () => {
            const key = apiKeyInput.value.trim();
            if (key) {
                localStorage.setItem('geminiApiKey', key);
                geminiApiKey = key;
                alert('API Key đã được lưu vào trình duyệt!');
                apiKeyInput.value = '';
                apiKeyInputSection.style.display = 'none';
                apiKeyStatusMessage.textContent = 'API Key đã được lưu.';
                apiKeyStatusMessage.classList.remove('api-key-not-saved-message');
                saveApiKeyButton.disabled = true;
            } else {
                alert('Vui lòng nhập API Key.');
            }
        });
    }

    if (clearApiKeyButton) {
        clearApiKeyButton.addEventListener('click', () => {
            localStorage.removeItem('geminiApiKey');
            geminiApiKey = '';
            // Cân nhắc việc xóa api.txt nếu bạn có quyền (thường là không thể từ client-side JS)
            alert('API Key đã được xóa khỏi trình duyệt. Nếu có file api.txt, bạn cần xóa thủ công.');
            apiKeyInputSection.style.display = 'block';
            apiKeyInput.value = '';
            apiKeyInput.disabled = false;
            saveApiKeyButton.disabled = false;
            apiKeyStatusMessage.textContent = 'API Key chưa được lưu.';
            apiKeyStatusMessage.classList.add('api-key-not-saved-message');
        });
    }

    async function fetchPrompt() {
        try {
            const response = await fetch('prompt.txt'); // Giả sử prompt.txt cùng cấp với index.html
            if (!response.ok) throw new Error(`Could not fetch prompt.txt: ${response.statusText}`);
            promptContent = await response.text();
            console.log('Prompt.txt loaded successfully.');
        } catch (error) {
            console.error('Error loading prompt.txt:', error);
            if(aiErrorStatus) aiErrorStatus.textContent = 'Lỗi: Không thể tải prompt.txt. Vui lòng kiểm tra file.';
        }
    }

    if (sendToAiButton) {
        sendToAiButton.addEventListener('click', async () => {
            if(aiHtmlResponseContainer) aiHtmlResponseContainer.innerHTML = '<p style="color: #777;">Đang gửi dữ liệu đến AI và chờ phản hồi...</p>';
            if(aiErrorStatus) aiErrorStatus.textContent = '';

            const overallSummaryEl = document.getElementById('overallSummary');
            if (!overallSummaryEl) {
                if(aiErrorStatus) aiErrorStatus.textContent = 'Lỗi: Không tìm thấy vùng tóm tắt tổng quan.';
                return;
            }
            const summaryData = overallSummaryEl.value;

            if (!geminiApiKey) {
                if(aiErrorStatus) aiErrorStatus.textContent = 'Lỗi: Vui lòng nhập và lưu Gemini API Key trước khi gửi.';
                apiKeyInputSection.style.display = 'block'; // Hiển thị lại phần nhập key
                return;
            }
            if (!promptContent) {
                if(aiErrorStatus) aiErrorStatus.textContent = 'Lỗi: Chưa tải được nội dung prompt. Vui lòng thử lại sau hoặc kiểm tra file prompt.txt.';
                return;
            }

            sendToAiButton.disabled = true;
            if(loadingSpinner) loadingSpinner.style.display = 'inline-block';
            
            const requestBody = {
                contents: [{ parts: [{ text: promptContent + "\n\n--- Dữ liệu bệnh nhân ---\n" + summaryData }] }],
            };
            const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;
            
            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody)
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`API Error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
                }
                const data = await response.json();
                if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts.length > 0) {
                    if(aiHtmlResponseContainer) aiHtmlResponseContainer.innerHTML = data.candidates[0].content.parts[0].text;
                } else {
                    if(aiHtmlResponseContainer) aiHtmlResponseContainer.innerHTML = '<p style="color: #777;">Không có phản hồi từ AI hoặc phản hồi không hợp lệ.</p>';
                    if (data.promptFeedback && data.promptFeedback.blockReason) {
                        if(aiErrorStatus) aiErrorStatus.textContent = `Phản hồi bị chặn: ${data.promptFeedback.blockReason}. Chi tiết: ${data.promptFeedback.blockReasonMessage || ''}`;
                    } else if (data.error) {
                        if(aiErrorStatus) aiErrorStatus.textContent = `Lỗi từ API: ${data.error.message}`;
                    }
                }
            } catch (error) {
                console.error('Error calling Gemini API:', error);
                if(aiErrorStatus) aiErrorStatus.textContent = `Lỗi khi gọi AI: ${error.message}. Vui lòng kiểm tra API Key hoặc kết nối mạng.`;
                if(aiHtmlResponseContainer) aiHtmlResponseContainer.innerHTML = '<p style="color: red;">Đã xảy ra lỗi khi phân tích. Vui lòng thử lại.</p>';
            } finally {
                sendToAiButton.disabled = false;
                if(loadingSpinner) loadingSpinner.style.display = 'none';
            }
        });
    }

    // Initial setup calls for API related functionalities
    initializeApiKey();
    fetchPrompt();
});