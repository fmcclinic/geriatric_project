document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('screeningForm');
    const sendToAiButton = document.getElementById('sendToAiButton');
    const aiHtmlResponseContainer = document.getElementById('aiHtmlResponseContainer');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const aiErrorStatus = document.getElementById('aiErrorStatus');
    const apiKeyInputSection = document.getElementById('apiKeyInputSection');
    const apiKeyInput = document.getElementById('apiKeyInput');
    const saveApiKeyButton = document.getElementById('saveApiKeyButton');
    const clearApiKeyButton = document.getElementById('clearApiKeyButton');
    const apiKeyStatusMessage = document.getElementById('apiKeyStatusMessage');

    let geminiApiKey = '';
    let promptContent = '';

    async function initializeApiKey() {
        let keyFound = false;
        try {
            // Giả sử api.txt cùng cấp với index.html
            const response = await fetch('api.txt');
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
            saveApiKeyButton.disabled = false;
        }
    }

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
        } else {
            alert('Vui lòng nhập API Key.');
        }
    });

    clearApiKeyButton.addEventListener('click', () => {
        localStorage.removeItem('geminiApiKey');
        geminiApiKey = '';
        alert('API Key đã được xóa khỏi trình duyệt.');
        apiKeyInputSection.style.display = 'block';
        apiKeyInput.value = '';
        apiKeyInput.disabled = false;
        saveApiKeyButton.disabled = false;
        apiKeyStatusMessage.textContent = 'API Key chưa được lưu.';
        apiKeyStatusMessage.classList.add('api-key-not-saved-message');
    });

    function getCheckedRadioValue(name) {
        const radio = form.querySelector(`input[name="${name}"]:checked`);
        return radio ? radio.value : '';
    }

    function calculateMnaSf() {
        let total = 0;
        const questions = ['mna_q1', 'mna_q2', 'mna_q3', 'mna_q4', 'mna_q5', 'mna_q6'];
        questions.forEach(qName => {
            const selected = form.querySelector(`input[name="${qName}"]:checked`);
            if (selected) total += parseInt(selected.value);
        });
        document.getElementById('mnaTotalScore').value = total;
        updateSummaryNutrition(total);
    }

    function calculateGdsSf() {
        let total = 0;
        const questions = [
            'gds_q1', 'gds_q2', 'gds_q3', 'gds_q4', 'gds_q5', 'gds_q6', 'gds_q7', 'gds_q8',
            'gds_q9', 'gds_q10', 'gds_q11', 'gds_q12', 'gds_q13', 'gds_q14', 'gds_q15'
        ];
        questions.forEach(qName => {
            const selected = form.querySelector(`input[name="${qName}"]:checked`);
            if (selected) total += parseInt(selected.value);
        });
        document.getElementById('gdsTotalScore').value = total;
        updateSummaryPsychoCognitive(total);
    }
    
    function evaluateAndDisplayAdlIadl() {
        const adlNames = {
            adl_1: "Tắm rửa", adl_2: "Mặc quần áo", adl_3: "Đi vệ sinh",
            adl_4: "Ăn uống", adl_5: "Di chuyển", adl_6: "Kiểm soát đại/tiểu tiện"
        };
        const iadlNames = {
            iadl_7: "Sử dụng điện thoại", iadl_8: "Mua sắm", iadl_9: "Nấu ăn",
            iadl_10: "Dọn dẹp nhà cửa", iadl_11: "Giặt giũ quần áo", iadl_12: "Quản lý tiền bạc",
            iadl_13: "Sử dụng phương tiện đi lại", iadl_14: "Uống thuốc đúng theo chỉ dẫn"
        };

        let adlIndependentCount = 0;
        let adlSummaryDetails = [];
        for (const name in adlNames) {
            const selected = form.querySelector(`input[name="${name}"]:checked`);
            const note = form.querySelector(`input[name="note_${name}"]`)?.value.trim();
            if (selected) {
                if (selected.value === "Độc lập") {
                    adlIndependentCount++;
                } else {
                    adlSummaryDetails.push(`${adlNames[name]}: ${selected.value}${note ? ` (${note})` : ''}`);
                }
            }
        }

        let adlAssessmentText = `Tổng điểm ADLs: ${adlIndependentCount}/6. `;
        if (adlIndependentCount === 6) {
            adlAssessmentText += 'Độc lập hoàn toàn trong các hoạt động sinh hoạt cơ bản.';
        } else if (adlIndependentCount >= 4) {
            adlAssessmentText += 'Độc lập phần lớn, cần hỗ trợ tối thiểu trong ADLs.';
        } else if (adlIndependentCount >= 2) {
            adlAssessmentText += 'Phụ thuộc mức độ trung bình trong ADLs.';
        } else if (adlSummaryDetails.length > 0 || (form.querySelector(`input[name="adl_1"]:checked`) && adlIndependentCount < 2) ) {
            adlAssessmentText += 'Phụ thuộc nhiều/hoàn toàn trong các hoạt động sinh hoạt cơ bản.';
        } else {
             adlAssessmentText += 'Chưa có thông tin đánh giá ADLs đầy đủ.';
        }
        if (adlSummaryDetails.length > 0) {
            adlAssessmentText += ` Các hoạt động cần hỗ trợ: ${adlSummaryDetails.join(', ')}.`;
        }

        let iadlIndependentCount = 0;
        let iadlSummaryDetails = [];
        for (const name in iadlNames) {
            const selected = form.querySelector(`input[name="${name}"]:checked`);
            const note = form.querySelector(`input[name="note_${name}"]`)?.value.trim();
            if (selected) {
                if (selected.value === "Độc lập") {
                    iadlIndependentCount++;
                } else {
                    iadlSummaryDetails.push(`${iadlNames[name]}: ${selected.value}${note ? ` (${note})` : ''}`);
                }
            }
        }

        let iadlAssessmentText = `Tổng điểm IADLs: ${iadlIndependentCount}/8. `;
         if (iadlIndependentCount === 8) {
            iadlAssessmentText += 'Độc lập hoàn toàn trong các hoạt động sinh hoạt nâng cao.';
        } else if (iadlIndependentCount >= 5) {
            iadlAssessmentText += 'Cần hỗ trợ một phần trong IADLs.';
        } else if (iadlSummaryDetails.length > 0 || (form.querySelector(`input[name="iadl_7"]:checked`) && iadlIndependentCount < 5)) {
            iadlAssessmentText += 'Phụ thuộc nhiều vào người chăm sóc trong IADLs.';
        } else {
             iadlAssessmentText += 'Chưa có thông tin đánh giá IADLs đầy đủ.';
        }
        if (iadlSummaryDetails.length > 0) {
            iadlAssessmentText += ` Các hoạt động cần hỗ trợ: ${iadlSummaryDetails.join(', ')}.`;
        }

        document.getElementById('adlAssessmentResult').textContent = adlAssessmentText;
        document.getElementById('iadlAssessmentResult').textContent = iadlAssessmentText;
        document.getElementById('summaryADLIADL').value = `${adlAssessmentText}\n${iadlAssessmentText}`;
        
        return { adl: adlAssessmentText, iadl: iadlAssessmentText };
    }

    function updateSummaryBasicInfo() {
        const livingArrangement = getCheckedRadioValue('livingArrangement');
        const livingArrangementOther = document.querySelector('textarea[name="livingArrangementOther"]')?.value.trim();
        const maritalStatus = getCheckedRadioValue('maritalStatus');
        const fullName = document.getElementById('fullName')?.value.trim();
        const age = document.getElementById('age')?.value.trim();
        const summary = [];
        if (fullName) summary.push(`Họ và tên: ${fullName}.`);
        if (age) summary.push(`Tuổi: ${age}.`);
        if (livingArrangement) {
            if (livingArrangement === "Khác" && livingArrangementOther) {
                summary.push(`Sống cùng: ${livingArrangementOther}.`);
            } else if (livingArrangement !== "Khác") {
                summary.push(`Sống cùng: ${livingArrangement}.`);
            }
        }
        if (maritalStatus) summary.push(`Tình trạng hôn nhân: ${maritalStatus}.`);
        document.getElementById('summaryBasicInfo').value = summary.join(' ');
    }

    function updateSummaryChronicDiseases() {
        const selectedDiseases = Array.from(form.querySelectorAll('input[name="chronicDisease"]:checked'))
            .map(cb => {
                let details = '';
                const nextElement = cb.parentNode.nextElementSibling;
                // Kiểm tra xem nextElement có tồn tại và là input/textarea không
                // và có phải là phần tử chi tiết liên quan không (ví dụ, không phải là một label khác)
                if (nextElement && (nextElement.tagName === 'INPUT' || nextElement.tagName === 'TEXTAREA') && 
                    (nextElement.name.startsWith('details_') || nextElement.name.startsWith('year_'))) {
                    const detailsValue = nextElement.value.trim();
                    if (detailsValue) {
                        details = ` (${detailsValue})`;
                    }
                }
                return `${cb.value}${details}`;
            });

        const surgeryHospitalization = getCheckedRadioValue('surgeryHospitalization');
        const surgeryHospitalizationDetails = document.querySelector('textarea[name="details_surgeryHospitalization"]')?.value.trim();
        
        const familyHistory = Array.from(form.querySelectorAll('input[name="familyHistory"]:checked'))
            .map(cb => {
                if (cb.value === 'Khác (tiền sử gia đình)') {
                    // Phần tử tiếp theo của label chứa checkbox "Khác..." là textarea
                    const nextElement = cb.parentNode.nextElementSibling;
                    if (nextElement && nextElement.tagName === 'TEXTAREA' && nextElement.name === 'details_Khác_tiền_sử_gia_đình') {
                         const detailsValue = nextElement.value.trim();
                         return detailsValue ? `Khác (${detailsValue})` : cb.value;
                    }
                    return cb.value;
                }
                return cb.value;
            });

        const selectedVaccines = Array.from(form.querySelectorAll('input[name="vaccine"]:checked'))
            .map(cb => {
                let vaccineName = cb.value;
                let associatedDetail = '';
                const nextElement = cb.parentNode.nextElementSibling;
                if (nextElement && nextElement.tagName === 'INPUT' && nextElement.type === 'text') {
                    const nextElementValue = nextElement.value.trim();
                    if (nextElementValue) {
                        if (cb.value === 'Khác (vắc-xin)') { // Input là tên vắc-xin khác
                            vaccineName = nextElementValue;
                        } else { // Input là năm tiêm
                            associatedDetail = ` (${nextElementValue})`;
                        }
                    }
                }
                return `${vaccineName}${associatedDetail}`;
            });

        let summary = [];
        if (selectedDiseases.length > 0) summary.push(`Bệnh lý mãn tính: ${selectedDiseases.join(', ')}.`);
        if (surgeryHospitalization === "Có" && surgeryHospitalizationDetails) {
            summary.push(`Từng phẫu thuật/nhập viện trong 12 tháng qua: ${surgeryHospitalizationDetails}.`);
        } else if (surgeryHospitalization === "Không") {
            summary.push(`Không phẫu thuật/nhập viện trong 12 tháng qua.`);
        }
        if (familyHistory.length > 0) summary.push(`Tiền sử gia đình: ${familyHistory.join(', ')}.`);
        if (selectedVaccines.length > 0) summary.push(`Đã tiêm vắc-xin: ${selectedVaccines.join(', ')}.`);
        document.getElementById('summaryChronicDiseases').value = summary.join(' ');
    }

    function updateSummaryMedicationSense() {
        const medicationCount = getCheckedRadioValue('medicationCount');
        const medicationDifficulty = getCheckedRadioValue('medicationDifficulty');
        const medicationDifficultyDetails = document.querySelector('textarea[name="details_medicationDifficulty"]')?.value.trim();
        const vision = getCheckedRadioValue('visionImpairment');
        const lastEyeExam = document.getElementById('lastEyeExam')?.value.trim();
        const hearing = getCheckedRadioValue('hearingDifficulty');
        const lastEarExam = document.getElementById('lastEarExam')?.value.trim();
        const dental = getCheckedRadioValue('dentalProblem');
        const lastDentalExam = document.getElementById('lastDentalExam')?.value.trim();
        let summary = [];
        if (medicationCount) summary.push(`Sử dụng ${medicationCount} thuốc.`);
        if (medicationDifficulty === "Có" && medicationDifficultyDetails) {
            summary.push(`Khó khăn quản lý thuốc: ${medicationDifficultyDetails}.`);
        } else if (medicationDifficulty === "Không") {
            summary.push(`Không khó khăn quản lý thuốc.`);
        }
        if (vision) {
            let visionText = `Thị lực: ${vision}.`;
            if (lastEyeExam) { // Luôn thêm thông tin khám nếu có, bất kể lựa chọn nào
                visionText += ` Khám gần nhất: ${lastEyeExam}.`;
            }
            summary.push(visionText);
        }
        if (hearing) {
            let hearingText = `Thính lực: ${hearing}.`;
            if (lastEarExam) { // Luôn thêm thông tin khám nếu có
                hearingText += ` Khám gần nhất: ${lastEarExam}.`;
            }
            summary.push(hearingText);
        }
        if (dental) {
            let dentalText = `Răng miệng: ${dental}.`;
            if (lastDentalExam) { // Luôn thêm thông tin khám nếu có
                dentalText += ` Khám gần nhất: ${lastDentalExam}.`;
            }
            summary.push(dentalText);
        }
        document.getElementById('summaryMedicationSense').value = summary.join(' ');
    }

    function updateSummaryNutrition(mnaScore) {
        let assessmentText = '';
        if (mnaScore >= 12 && mnaScore <= 14) assessmentText = 'Tình trạng dinh dưỡng tốt.';
        else if (mnaScore >= 8 && mnaScore <= 11) assessmentText = 'Nguy cơ suy dinh dưỡng (cần theo dõi và tư vấn dinh dưỡng).';
        else if (mnaScore >= 0 && mnaScore <= 7) assessmentText = 'Suy dinh dưỡng (cần can thiệp dinh dưỡng chuyên sâu).';
        else assessmentText = 'Chưa có thông tin đánh giá dinh dưỡng đầy đủ.';
        document.getElementById('summaryNutrition').value = `MNA-SF: ${mnaScore} điểm. ${assessmentText}`;
        
        const mnaLis = document.querySelectorAll('#mnaAssessmentSummary li');
        mnaLis.forEach(li => {
            li.style.fontWeight = 'normal';
            li.style.backgroundColor = 'transparent';
            if ( (mnaScore >=12 && mnaScore <=14 && li.textContent.includes("12-14 điểm")) ||
                 (mnaScore >=8 && mnaScore <=11 && li.textContent.includes("8-11 điểm")) ||
                 (mnaScore >=0 && mnaScore <=7 && li.textContent.includes("0-7 điểm")) ) {
                li.style.fontWeight = 'bold';
                li.style.backgroundColor = '#e8f5e9';
            }
        });
    }

    function updateSummaryPsychoCognitive(gdsScore) {
        let assessmentText = '';
        if (gdsScore >= 0 && gdsScore <= 4) assessmentText = 'Bình thường (ít hoặc không có trầm cảm).';
        else if (gdsScore >= 5 && gdsScore <= 8) assessmentText = 'Trầm cảm nhẹ (cần theo dõi và tư vấn).';
        else if (gdsScore >= 9 && gdsScore <= 11) assessmentText = 'Trầm cảm vừa (cần thăm khám chuyên khoa tâm thần).';
        else if (gdsScore >= 12 && gdsScore <= 15) assessmentText = 'Trầm cảm nặng (cần can thiệp y tế khẩn cấp nếu có dấu hiệu nguy hiểm).';
        else assessmentText = 'Chưa có thông tin đánh giá trầm cảm đầy đủ.';
        document.getElementById('summaryPsychoCognitive').value = `GDS-SF: ${gdsScore} điểm. ${assessmentText}`;

        const gdsLis = document.querySelectorAll('#gdsAssessmentSummary li');
        gdsLis.forEach(li => {
            li.style.fontWeight = 'normal';
            li.style.backgroundColor = 'transparent';
             if ( (gdsScore >=0 && gdsScore <=4 && li.textContent.includes("0-4 điểm")) ||
                 (gdsScore >=5 && gdsScore <=8 && li.textContent.includes("5-8 điểm")) ||
                 (gdsScore >=9 && gdsScore <=11 && li.textContent.includes("9-11 điểm")) ||
                 (gdsScore >=12 && gdsScore <=15 && li.textContent.includes("12-15 điểm")) ) {
                li.style.fontWeight = 'bold';
                li.style.backgroundColor = '#e8f5e9';
            }
        });
    }

    function updateSummaryFallRisk() {
        const fallCount = getCheckedRadioValue('fallCount');
        const fallInjury = getCheckedRadioValue('fallInjury');
        const balanceDizziness = getCheckedRadioValue('balanceDizziness');
        const legWeakness = getCheckedRadioValue('legWeakness');
        const assistiveDevice = getCheckedRadioValue('assistiveDevice');
        const assistiveDeviceDetails = document.querySelector('input[name="details_assistiveDevice"]')?.value.trim();
        const medicationEffectBalance = getCheckedRadioValue('medicationEffectBalance');
        const environmentalFactors = Array.from(form.querySelectorAll('input[name="environmentalFactors"]:checked'))
            .filter(cb => cb.value !== 'Không có yếu tố nào').map(cb => cb.value);
        const tugTimeInput = document.getElementById('tugTime');
        const tugTime = tugTimeInput?.value ? parseFloat(tugTimeInput.value) : NaN;
        const oneLegStandTimeInput = document.getElementById('oneLegStandTime');
        const oneLegStandTime = oneLegStandTimeInput?.value ? parseFloat(oneLegStandTimeInput.value) : NaN;
        let summary = [];
        if (fallCount) summary.push(`Số lần té ngã trong 12 tháng: ${fallCount}.`);
        if (fallInjury && fallCount !== '0 lần' && fallInjury !== 'Không áp dụng') summary.push(`Té ngã gây chấn thương: ${fallInjury}.`);
        if (balanceDizziness) summary.push(`Mất thăng bằng/chóng mặt: ${balanceDizziness}.`);
        if (legWeakness) summary.push(`Yếu chân/đi lại không vững: ${legWeakness}.`);
        if (assistiveDevice === "Có" && assistiveDeviceDetails) summary.push(`Sử dụng dụng cụ hỗ trợ: ${assistiveDeviceDetails}.`);
        else if (assistiveDevice === "Không") summary.push(`Không sử dụng dụng cụ hỗ trợ đi lại.`);
        if (medicationEffectBalance) summary.push(`Thuốc ảnh hưởng thăng bằng: ${medicationEffectBalance}.`);
        if (environmentalFactors.length > 0) summary.push(`Yếu tố môi trường nguy cơ té ngã: ${environmentalFactors.join(', ')}.`);
        else if (form.querySelector('input[name="environmentalFactors"][value="Không có yếu tố nào"]:checked')) summary.push(`Môi trường sống không có yếu tố nguy cơ té ngã.`);
        
        const tugLis = document.querySelectorAll('#tugAssessmentSummary li');
        tugLis.forEach(li => { li.style.fontWeight = 'normal'; li.style.backgroundColor = 'transparent';});

        if (!isNaN(tugTime)) {
            let tugAssessment = '';
            if (tugTime <= 12) {
                tugAssessment = 'Nguy cơ té ngã thấp.';
                tugLis.forEach(li => { if(li.textContent.includes("≤ 12 giây")) {li.style.fontWeight = 'bold'; li.style.backgroundColor = '#e8f5e9';}});
            } else {
                tugAssessment = 'Nguy cơ té ngã tăng đáng kể (cần đánh giá thăng bằng và dáng đi chuyên sâu).';
                 tugLis.forEach(li => { if(li.textContent.includes("> 12 giây")) {li.style.fontWeight = 'bold'; li.style.backgroundColor = '#e8f5e9';}});
            }
            summary.push(`TUG Test: ${tugTime} giây (${tugAssessment})`);
        } else {
            // Nếu TUG không được nhập, đảm bảo không có li nào được highlight
             tugLis.forEach(li => { li.style.fontWeight = 'normal'; li.style.backgroundColor = 'transparent';});
        }
        if (!isNaN(oneLegStandTime)) summary.push(`One-Leg Stand Test: ${oneLegStandTime} giây.`);
        document.getElementById('summaryFallRisk').value = summary.join(' ');
    }

    function updateSummaryLifestyle() {
        const exerciseFrequency = getCheckedRadioValue('exerciseFrequency');
        const exerciseDetails = document.querySelector('textarea[name="exerciseDetails"]')?.value.trim();
        const smoking = getCheckedRadioValue('smoking');
        const cigarettesPerDay = document.querySelector('input[name="cigarettesPerDay"]')?.value.trim();
        const quitSmokingTime = document.querySelector('input[name="quitSmokingTime"]')?.value.trim();
        const alcohol = getCheckedRadioValue('alcohol');
        let alcoholDetails = '';
        if (alcohol === "Hàng ngày") alcoholDetails = document.querySelector('input[name="alcoholDailyAmount"]')?.value.trim();
        else if (alcohol === "Vài lần/tuần") alcoholDetails = document.querySelector('input[name="alcoholWeeklyAmount"]')?.value.trim();
        else if (alcohol === "Thỉnh thoảng") alcoholDetails = document.querySelector('input[name="alcoholOccasionalAmount"]')?.value.trim();
        const sleepProblem = getCheckedRadioValue('sleepProblem');
        const sleepProblemDetails = document.querySelector('textarea[name="sleepProblemDetails"]')?.value.trim();
        const socialActivities = getCheckedRadioValue('socialActivities');
        const socialActivitiesDetails = document.querySelector('textarea[name="socialActivitiesDetails"]')?.value.trim();
        const socialActivitiesNoDetails = document.querySelector('textarea[name="socialActivitiesNoDetails"]')?.value.trim();
        const otherSymptoms = getCheckedRadioValue('otherSymptoms');
        const otherSymptomsDetails = document.querySelector('textarea[name="otherSymptomsDetails"]')?.value.trim();
        let summary = [];
        if (exerciseFrequency) {
            let exerciseText = `Vận động: ${exerciseFrequency}.`;
            if (exerciseDetails && exerciseFrequency !== "Hầu như không vận động") exerciseText += ` Mô tả: ${exerciseDetails}.`;
            summary.push(exerciseText);
        }
        if (smoking === "Có" && cigarettesPerDay) summary.push(`Hút thuốc lá: ${cigarettesPerDay} điếu/ngày.`);
        else if (smoking === "Đã bỏ" && quitSmokingTime) summary.push(`Đã bỏ thuốc lá: ${quitSmokingTime}.`);
        else if (smoking === "Không bao giờ hút") summary.push(`Không hút thuốc lá.`);
        if (alcohol) {
            let alcoholText = `Uống rượu bia: ${alcohol}.`;
            if (alcoholDetails && alcohol !== "Không bao giờ") alcoholText += ` Lượng: ${alcoholDetails}.`;
            summary.push(alcoholText);
        }
        if (sleepProblem === "Có" && sleepProblemDetails) summary.push(`Vấn đề giấc ngủ: ${sleepProblemDetails}.`);
        else if (sleepProblem === "Không") summary.push(`Không có vấn đề giấc ngủ.`);
        if (socialActivities === "Có" && socialActivitiesDetails) summary.push(`Tham gia hoạt động xã hội: ${socialActivitiesDetails}.`);
        else if (socialActivities === "Không") {
            let noSocialText = `Không tham gia hoạt động xã hội.`;
            if (socialActivitiesNoDetails) noSocialText += ` Lý do/khó khăn: ${socialActivitiesNoDetails}.`;
            summary.push(noSocialText);
        }
        if (otherSymptoms === "Có" && otherSymptomsDetails) summary.push(`Triệu chứng khó chịu khác: ${otherSymptomsDetails}.`);
        else if (otherSymptoms === "Không") summary.push(`Không có triệu chứng khó chịu khác.`);
        document.getElementById('summaryLifestyle').value = summary.join(' ');
    }

    function updateAllSummaries() {
        updateSummaryBasicInfo();
        updateSummaryChronicDiseases();
        updateSummaryMedicationSense();
        
        const adlIadlResults = evaluateAndDisplayAdlIadl();

        calculateMnaSf();
        calculateGdsSf();
        updateSummaryFallRisk();
        updateSummaryLifestyle();

        const fullName = document.getElementById('fullName')?.value.trim();
        const age = document.getElementById('age')?.value.trim();
        let overallTextIntro = `Tổng quan: `;
        if (fullName && age) overallTextIntro += `Bệnh nhân ${fullName}, ${age} tuổi. `;
        else if (fullName) overallTextIntro += `Bệnh nhân ${fullName}. `;
        else if (age) overallTextIntro += `${age} tuổi. `;

        let adlIadlSummaryForOverall = '';
        if (adlIadlResults && adlIadlResults.adl) { // Check if adlIadlResults and its properties are defined
            if (adlIadlResults.adl.includes('Phụ thuộc') || adlIadlResults.adl.includes('Cần hỗ trợ một phần') || adlIadlResults.adl.includes('Cần hỗ trợ tối thiểu')) {
                adlIadlSummaryForOverall += `Có sự phụ thuộc/cần hỗ trợ trong sinh hoạt hàng ngày (ADLs). `;
            } else if (adlIadlResults.adl.includes('Độc lập hoàn toàn')) {
                adlIadlSummaryForOverall += `Độc lập tốt trong sinh hoạt cơ bản (ADLs). `;
            }
        }
        if (adlIadlResults && adlIadlResults.iadl) {
            if (adlIadlResults.iadl.includes('Phụ thuộc') || adlIadlResults.iadl.includes('Cần hỗ trợ một phần')) {
                adlIadlSummaryForOverall += `Cần hỗ trợ trong các hoạt động sinh hoạt nâng cao (IADLs).`;
            } else if (adlIadlResults.iadl.includes('Độc lập hoàn toàn')) {
                adlIadlSummaryForOverall += `Độc lập tốt trong sinh hoạt nâng cao (IADLs).`;
            }
        }
        
        let overallText = overallTextIntro + adlIadlSummaryForOverall.trim();

        const allSummariesContent = [
            document.getElementById('summaryBasicInfo').value,
            document.getElementById('summaryChronicDiseases').value,
            document.getElementById('summaryMedicationSense').value,
            document.getElementById('summaryADLIADL').value,
            document.getElementById('summaryNutrition').value,
            document.getElementById('summaryPsychoCognitive').value,
            document.getElementById('summaryFallRisk').value,
            document.getElementById('summaryLifestyle').value
        ].filter(s => s && s.trim() !== '').join('\n\n');

        document.getElementById('overallSummary').value = overallText.trim() + (allSummariesContent ? '\n\n' + allSummariesContent : '');
    }

    async function fetchPrompt() {
        try {
            // Giả sử prompt.txt cùng cấp với index.html
            const response = await fetch('prompt.txt');
            if (!response.ok) throw new Error(`Could not fetch prompt.txt: ${response.statusText}`);
            promptContent = await response.text();
            console.log('Prompt.txt loaded successfully.');
        } catch (error) {
            console.error('Error loading prompt.txt:', error);
            aiErrorStatus.textContent = 'Lỗi: Không thể tải prompt.txt. Vui lòng kiểm tra file.';
        }
    }

    sendToAiButton.addEventListener('click', async () => {
        aiHtmlResponseContainer.innerHTML = '<p style="color: #777;">Đang gửi dữ liệu đến AI và chờ phản hồi...</p>';
        aiErrorStatus.textContent = '';
        if (!geminiApiKey) {
            aiErrorStatus.textContent = 'Lỗi: Vui lòng nhập và lưu Gemini API Key trước khi gửi.';
            return;
        }
        if (!promptContent) {
            aiErrorStatus.textContent = 'Lỗi: Chưa tải được nội dung prompt. Vui lòng thử lại sau.';
            return;
        }
        sendToAiButton.disabled = true;
        loadingSpinner.style.display = 'inline-block';
        const summaryData = document.getElementById('overallSummary').value;
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
                aiHtmlResponseContainer.innerHTML = data.candidates[0].content.parts[0].text;
            } else {
                aiHtmlResponseContainer.innerHTML = '<p style="color: #777;">Không có phản hồi từ AI hoặc phản hồi không hợp lệ.</p>';
                 if (data.promptFeedback && data.promptFeedback.blockReason) {
                    aiErrorStatus.textContent = `Phản hồi bị chặn: ${data.promptFeedback.blockReason}. Chi tiết: ${data.promptFeedback.blockReasonMessage || ''}`;
                }
            }
        } catch (error) {
            console.error('Error calling Gemini API:', error);
            aiErrorStatus.textContent = `Lỗi khi gọi AI: ${error.message}. Vui lòng kiểm tra API Key hoặc kết nối mạng.`;
            aiHtmlResponseContainer.innerHTML = '<p style="color: red;">Đã xảy ra lỗi khi phân tích. Vui lòng thử lại.</p>';
        } finally {
            sendToAiButton.disabled = false;
            loadingSpinner.style.display = 'none';
        }
    });

    form.addEventListener('change', updateAllSummaries);
    form.addEventListener('input', function(event) {
        const target = event.target;
        // Chỉ gọi updateAllSummaries nếu là các trường input text, number, tel hoặc textarea
        // để tránh gọi nhiều lần không cần thiết khi chỉ focus/blur
        if ( (target.tagName === 'INPUT' && (target.type === 'text' || target.type === 'number' || target.type === 'tel')) || 
             target.tagName === 'TEXTAREA' || 
             target.type === 'date' ) { // Thêm date vào đây nếu muốn update ngay khi chọn ngày
            updateAllSummaries();
        }
    });
    // Xử lý riêng cho radio và checkbox vì 'input' event có thể không như ý muốn
    form.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach(input => {
        input.addEventListener('change', updateAllSummaries);
    });


    initializeApiKey();
    fetchPrompt();
    updateAllSummaries();
});