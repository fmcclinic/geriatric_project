document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('screeningForm');
    if (!form) {
        console.error("Form element not found!");
        return;
    }

    // --- Logic cho Collapsible Sections ---
    const sectionToggles = document.querySelectorAll('.section-toggle');
    sectionToggles.forEach(toggle => {
        const content = toggle.nextElementSibling;
        if (content && content.classList.contains('section-content')) {
            const isInitiallyExpanded = content.style.display === 'block';
            toggle.setAttribute('aria-expanded', String(isInitiallyExpanded));
            if (isInitiallyExpanded) {
                toggle.classList.add('expanded');
            }
            
            toggle.setAttribute('role', 'button');
            toggle.setAttribute('tabindex', '0');

            toggle.addEventListener('click', () => {
                const isExpanded = content.style.display === 'block';
                content.style.display = isExpanded ? 'none' : 'block';
                toggle.classList.toggle('expanded', !isExpanded);
                toggle.setAttribute('aria-expanded', String(!isExpanded));
            });

            toggle.addEventListener('keydown', function(event) {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    toggle.click();
                }
            });
        } else {
            console.warn("Cấu trúc HTML không đúng cho section-toggle, không tìm thấy .section-content kế tiếp:", toggle);
        }
    });
    // --- Kết thúc Logic cho Collapsible Sections ---

    // --- Logic Lưu/Khôi phục Form vào localStorage ---
    const LOCAL_STORAGE_KEY = 'screeningFormData';

    function saveFormDataToLocalStorage() {
        const formData = {};
        form.querySelectorAll('input, textarea, select').forEach(element => {
            if (element.name) {
                if (element.type === 'checkbox') {
                    formData[element.id || (element.name + `_val_${element.value}`)] = element.checked;
                } else if (element.type === 'radio') {
                    if (element.checked) {
                        formData[element.name] = element.value;
                    }
                } else {
                    formData[element.name] = element.value;
                }
            }
        });
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(formData));
        // console.log('Form data saved to localStorage.');
    }

    function loadFormDataFromLocalStorage() {
        const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedData) {
            try {
                const formData = JSON.parse(savedData);
                if (confirm('Tìm thấy dữ liệu biểu mẫu đã lưu trước đó. Bạn có muốn khôi phục không?')) {
                    form.querySelectorAll('input, textarea, select').forEach(element => {
                        if (element.name) {
                            let fieldKey = element.id || (element.type === 'checkbox' ? (element.name + `_val_${element.value}`) : element.name);
                            
                            if (formData.hasOwnProperty(fieldKey)) {
                                if (element.type === 'checkbox') {
                                    element.checked = formData[fieldKey];
                                } else if (element.type === 'radio') {
                                    // Cần đảm bảo chỉ radio đúng value mới được check
                                    if (formData.hasOwnProperty(element.name) && element.value === formData[element.name]) {
                                        element.checked = true;
                                    } else {
                                        element.checked = false; // Bỏ check các radio khác trong cùng group
                                    }
                                } else {
                                    element.value = formData[fieldKey];
                                }
                            } else if (element.type === 'radio' && formData.hasOwnProperty(element.name) === false) {
                                // Nếu key của radio group không có trong formData (ví dụ chưa chọn gì lúc lưu)
                                // thì đảm bảo tất cả radio trong group đó không được check
                                element.checked = false;
                            }
                        }
                    });
                    console.log('Form data loaded from localStorage.');
                    updateAllSummaries(); 
                    Array.from(form.elements).forEach(el => {
                        const inputEvent = new Event('input', { bubbles: true, cancelable: true });
                        const changeEvent = new Event('change', { bubbles: true, cancelable: true });
                        el.dispatchEvent(inputEvent);
                        el.dispatchEvent(changeEvent);
                    });
                }
            } catch (e) {
                console.error("Error parsing saved form data:", e);
                localStorage.removeItem(LOCAL_STORAGE_KEY);
            }
        }
    }
    // --- Kết thúc Logic Lưu/Khôi phục Form ---

    // --- Logic Tính BMI ---
    const heightInput = document.getElementById('heightCm');
    const weightInput = document.getElementById('weightKg');
    const bmiResultSpan = document.getElementById('calculatedBmiResult');

    function calculateAndDisplayBmi() {
        if (!heightInput || !weightInput || !bmiResultSpan) return;

        const heightCm = parseFloat(heightInput.value);
        const weightKg = parseFloat(weightInput.value);

        if (heightCm > 0 && weightKg > 0) {
            const heightM = heightCm / 100;
            const bmi = weightKg / (heightM * heightM);
            bmiResultSpan.textContent = bmi.toFixed(2);
        } else {
            bmiResultSpan.textContent = '-';
        }
        updateAllSummaries();
    }

    if (heightInput) heightInput.addEventListener('input', calculateAndDisplayBmi);
    if (weightInput) weightInput.addEventListener('input', calculateAndDisplayBmi);
    // --- Kết thúc Logic Tính BMI ---


    // --- Helper Functions ---
    function getCheckedRadioValue(name) {
        const radio = form.querySelector(`input[name="${name}"]:checked`);
        return radio ? radio.value : '';
    }

    function debounce(func, delay) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    }
    // --- Kết thúc Helper Functions ---


    // --- Các hàm tính điểm và cập nhật Summary ---
    function calculateMnaSf() {
        let total = 0;
        const questions = ['mna_q1', 'mna_q2', 'mna_q3', 'mna_q4', 'mna_q5'];
        questions.forEach(qName => {
            const selected = form.querySelector(`input[name="${qName}"]:checked`);
            if (selected) total += parseInt(selected.value);
        });

        let mnaQ6Score = 0;
        if (bmiResultSpan && bmiResultSpan.textContent !== '-') {
            const bmi = parseFloat(bmiResultSpan.textContent);
            if (!isNaN(bmi)) {
                if (bmi < 19) mnaQ6Score = 0;
                else if (bmi >= 19 && bmi < 21) mnaQ6Score = 1;
                else if (bmi >= 21 && bmi < 23) mnaQ6Score = 2;
                else if (bmi >= 23) mnaQ6Score = 3;
            }
        }
        total += mnaQ6Score;
        const mnaTotalScoreEl = document.getElementById('mnaTotalScore');
        if (mnaTotalScoreEl) mnaTotalScoreEl.value = total;
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
        const gdsTotalScoreEl = document.getElementById('gdsTotalScore');
        if(gdsTotalScoreEl) gdsTotalScoreEl.value = total;
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
        let adlAnswered = false;
        for (const name in adlNames) {
            const selected = form.querySelector(`input[name="${name}"]:checked`);
            if (selected) adlAnswered = true;
            const noteInput = form.querySelector(`input[name="note_${name}"]`);
            const note = noteInput ? noteInput.value.trim() : '';
            if (selected) {
                if (selected.value === "Độc lập") {
                    adlIndependentCount++;
                } else {
                    adlSummaryDetails.push(`${adlNames[name]}: ${selected.value}${note ? ` (${note})` : ''}`);
                }
            }
        }

        let adlAssessmentText = `Tổng điểm ADLs: ${adlIndependentCount}/6. `;
        if (!adlAnswered) adlAssessmentText += 'Chưa có thông tin đánh giá ADLs đầy đủ.';
        else if (adlIndependentCount === 6) adlAssessmentText += 'Độc lập hoàn toàn trong các hoạt động sinh hoạt cơ bản.';
        else if (adlIndependentCount >= 4) adlAssessmentText += 'Độc lập phần lớn, cần hỗ trợ tối thiểu trong ADLs.';
        else if (adlIndependentCount >= 2) adlAssessmentText += 'Phụ thuộc mức độ trung bình trong ADLs.';
        else adlAssessmentText += 'Phụ thuộc nhiều/hoàn toàn trong các hoạt động sinh hoạt cơ bản.';
        if (adlSummaryDetails.length > 0) adlAssessmentText += ` Các hoạt động cần hỗ trợ: ${adlSummaryDetails.join(', ')}.`;

        let iadlIndependentCount = 0;
        let iadlSummaryDetails = [];
        let iadlAnswered = false;
        for (const name in iadlNames) {
            const selected = form.querySelector(`input[name="${name}"]:checked`);
            if(selected) iadlAnswered = true;
            const noteInput = form.querySelector(`input[name="note_${name}"]`);
            const note = noteInput ? noteInput.value.trim() : '';
            if (selected) {
                if (selected.value === "Độc lập") {
                    iadlIndependentCount++;
                } else {
                    iadlSummaryDetails.push(`${iadlNames[name]}: ${selected.value}${note ? ` (${note})` : ''}`);
                }
            }
        }

        let iadlAssessmentText = `Tổng điểm IADLs: ${iadlIndependentCount}/8. `;
        if(!iadlAnswered) iadlAssessmentText += 'Chưa có thông tin đánh giá IADLs đầy đủ.';
        else if (iadlIndependentCount === 8) iadlAssessmentText += 'Độc lập hoàn toàn trong các hoạt động sinh hoạt nâng cao.';
        else if (iadlIndependentCount >= 5) iadlAssessmentText += 'Cần hỗ trợ một phần trong IADLs.';
        else iadlAssessmentText += 'Phụ thuộc nhiều vào người chăm sóc trong IADLs.';
        if (iadlSummaryDetails.length > 0) iadlAssessmentText += ` Các hoạt động cần hỗ trợ: ${iadlSummaryDetails.join(', ')}.`;

        const adlAssessmentResultEl = document.getElementById('adlAssessmentResult');
        const iadlAssessmentResultEl = document.getElementById('iadlAssessmentResult');
        const summaryADLIADLEl = document.getElementById('summaryADLIADL');

        if(adlAssessmentResultEl) adlAssessmentResultEl.textContent = adlAssessmentText;
        if(iadlAssessmentResultEl) iadlAssessmentResultEl.textContent = iadlAssessmentText;
        if(summaryADLIADLEl) summaryADLIADLEl.value = `${adlAssessmentText}\n${iadlAssessmentText}`;
        
        return { adl: adlAssessmentText, iadl: iadlAssessmentText };
    }

    function updateSummaryBasicInfo() {
        const fieldsToInclude = {
            'fullName': 'Họ và tên',
            'age': 'Tuổi',
            'dob': 'Ngày sinh',
            'phoneNumber': 'Số điện thoại',
            'address': 'Địa chỉ hiện tại',
            'emergencyName': 'Người liên hệ khẩn cấp - Tên',
            'emergencyPhone': 'Người liên hệ khẩn cấp - SĐT',
            'occupation': 'Nghề nghiệp'
        };
        let summaryParts = [];

        for (const id in fieldsToInclude) {
            const element = document.getElementById(id);
            if (element && element.value.trim()) {
                summaryParts.push(`${fieldsToInclude[id]}: ${element.value.trim()}.`);
            }
        }
        
        const gender = getCheckedRadioValue('gender');
        if (gender) summaryParts.push(`Giới tính: ${gender}.`);

        const emergencyRelation = getCheckedRadioValue('emergencyRelation');
        const emergencyRelationOther = document.querySelector('textarea[name="emergencyRelationOther"]')?.value.trim();
        if (emergencyRelation) {
            let relationText = `Quan hệ người liên hệ khẩn cấp: ${emergencyRelation}`;
            if (emergencyRelation === 'Khác' && emergencyRelationOther) relationText += ` (${emergencyRelationOther})`;
            summaryParts.push(relationText + '.');
        }
        
        const maritalStatus = getCheckedRadioValue('maritalStatus');
        if (maritalStatus) summaryParts.push(`Tình trạng hôn nhân: ${maritalStatus}.`);

        const educationLevel = getCheckedRadioValue('educationLevel');
        if (educationLevel) summaryParts.push(`Trình độ học vấn: ${educationLevel}.`);

        const livingArrangement = getCheckedRadioValue('livingArrangement');
        const livingArrangementOther = document.querySelector('textarea[name="livingArrangementOther"]')?.value.trim();
        if (livingArrangement) {
            let livingText = `Sống cùng: ${livingArrangement}`;
            if (livingArrangement === 'Khác' && livingArrangementOther) livingText += ` (${livingArrangementOther})`;
            summaryParts.push(livingText + '.');
        }
        
        const summaryBasicInfoEl = document.getElementById('summaryBasicInfo');
        if(summaryBasicInfoEl) summaryBasicInfoEl.value = summaryParts.join(' ');
    }

    function updateSummaryChronicDiseases() {
        const selectedDiseases = Array.from(form.querySelectorAll('input[name="chronicDisease"]:checked'))
            .map(cb => {
                let details = '';
                const nextElement = cb.parentNode.nextElementSibling; 
                if (nextElement && (nextElement.tagName === 'INPUT' || nextElement.tagName === 'TEXTAREA') && nextElement.name.startsWith('details_')) {
                    const detailsValue = nextElement.value.trim();
                    if (detailsValue) details = ` (${detailsValue})`;
                }
                return `${cb.value}${details}`;
            });

        const surgeryHospitalization = getCheckedRadioValue('surgeryHospitalization');
        const surgeryHospitalizationDetails = document.querySelector('textarea[name="details_surgeryHospitalization"]')?.value.trim();
        
        const familyHistory = Array.from(form.querySelectorAll('input[name="familyHistory"]:checked'))
            .map(cb => {
                if (cb.value === 'Khác (tiền sử gia đình)') {
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
                if (nextElement && nextElement.tagName === 'INPUT' && nextElement.type === 'text' && (nextElement.name.startsWith('year_') || nextElement.name === 'details_Khác_vắc_xin')) {
                    const nextElementValue = nextElement.value.trim();
                    if (nextElementValue) {
                        if (cb.value === 'Khác (vắc-xin)') vaccineName = nextElementValue;
                        else associatedDetail = ` (${nextElementValue})`;
                    }
                }
                return `${vaccineName}${associatedDetail}`;
            });

        let summary = [];
        if (selectedDiseases.length > 0) summary.push(`Bệnh lý mãn tính: ${selectedDiseases.join(', ')}.`);
        if (surgeryHospitalization === "Có") {
            summary.push(`Từng phẫu thuật/nhập viện trong 12 tháng qua: ${surgeryHospitalizationDetails || 'Có, không rõ chi tiết'}.`);
        } else if (surgeryHospitalization === "Không") {
            summary.push(`Không phẫu thuật/nhập viện trong 12 tháng qua.`);
        }
        if (familyHistory.length > 0) summary.push(`Tiền sử gia đình: ${familyHistory.join(', ')}.`);
        if (selectedVaccines.length > 0) summary.push(`Đã tiêm vắc-xin: ${selectedVaccines.join(', ')}.`);
        
        const summaryChronicDiseasesEl = document.getElementById('summaryChronicDiseases');
        if(summaryChronicDiseasesEl) summaryChronicDiseasesEl.value = summary.join(' ');
    }

    // *** PHẦN ĐƯỢC CẬP NHẬT ĐỂ HIỂN THỊ TÓM TẮT GIÁC QUAN RÕ RÀNG HƠN ***
    function updateSummaryMedicationSense() {
        const medicationCount = getCheckedRadioValue('medicationCount');
        const medicationDifficulty = getCheckedRadioValue('medicationDifficulty');
        const medicationDifficultyDetails = document.querySelector('textarea[name="details_medicationDifficulty"]')?.value.trim();
        
        const visionValue = getCheckedRadioValue('visionImpairment');
        const lastEyeExam = document.getElementById('lastEyeExam')?.value.trim();
        
        const hearingValue = getCheckedRadioValue('hearingDifficulty');
        const lastEarExam = document.getElementById('lastEarExam')?.value.trim();
        
        const dentalValue = getCheckedRadioValue('dentalProblem');
        const lastDentalExam = document.getElementById('lastDentalExam')?.value.trim();

        let summary = [];
        if (medicationCount) {
            summary.push(`Sử dụng ${medicationCount} thuốc.`);
        }
        if (medicationDifficulty === "Có") {
            summary.push(`Khó khăn quản lý thuốc: ${medicationDifficultyDetails || 'Có, không rõ chi tiết'}.`);
        } else if (medicationDifficulty === "Không") {
            summary.push(`Không khó khăn quản lý thuốc.`);
        }

        // Vision Summary
        if (visionValue) {
            let visionText = '';
            if (visionValue === "Có") {
                visionText = "Thị lực: Có dấu hiệu suy giảm/vấn đề.";
            } else if (visionValue === "Không") {
                visionText = "Thị lực: Không có dấu hiệu suy giảm/vấn đề được báo cáo.";
            } else { // "Đang sử dụng kính/kính áp tròng và đã điều chỉnh phù hợp"
                visionText = `Thị lực: ${visionValue}.`;
            }
            if (lastEyeExam) {
                visionText += ` Lần khám mắt gần nhất: ${lastEyeExam}.`;
            } else if (visionValue === "Có" || visionValue === "Không") {
                 visionText += " Không rõ thông tin lần khám mắt gần nhất.";
            }
            summary.push(visionText);
        }

        // Hearing Summary
        if (hearingValue) {
            let hearingText = '';
            if (hearingValue === "Có") {
                hearingText = "Thính lực: Có khó khăn khi nghe/vấn đề.";
            } else if (hearingValue === "Không") {
                hearingText = "Thính lực: Không có khó khăn khi nghe/vấn đề được báo cáo.";
            } else { // "Đang sử dụng máy trợ thính"
                hearingText = `Thính lực: ${hearingValue}.`;
            }
            if (lastEarExam) {
                hearingText += ` Lần khám tai gần nhất: ${lastEarExam}.`;
            } else if (hearingValue === "Có" || hearingValue === "Không") {
                hearingText += " Không rõ thông tin lần khám tai gần nhất.";
            }
            summary.push(hearingText);
        }

        // Dental Summary
        if (dentalValue) {
            let dentalText = '';
            if (dentalValue === "Có") {
                dentalText = "Răng miệng: Có vấn đề.";
            } else if (dentalValue === "Không") {
                dentalText = "Răng miệng: Không có vấn đề được báo cáo.";
            } else { // "Đang sử dụng răng giả và cảm thấy thoải mái"
                dentalText = `Răng miệng: ${dentalValue}.`;
            }
            if (lastDentalExam) {
                dentalText += ` Lần khám nha khoa gần nhất: ${lastDentalExam}.`;
            } else if (dentalValue === "Có" || dentalValue === "Không") {
                dentalText += " Không rõ thông tin lần khám nha khoa gần nhất.";
            }
            summary.push(dentalText);
        }

        const summaryMedicationSenseEl = document.getElementById('summaryMedicationSense');
        if(summaryMedicationSenseEl) summaryMedicationSenseEl.value = summary.join(' ');
    }
    // *** KẾT THÚC PHẦN CẬP NHẬT ***

    function updateSummaryNutrition(mnaScore) {
        let assessmentText = '';
        if (mnaScore >= 12 && mnaScore <= 14) assessmentText = 'Tình trạng dinh dưỡng tốt.';
        else if (mnaScore >= 8 && mnaScore <= 11) assessmentText = 'Nguy cơ suy dinh dưỡng (cần theo dõi và tư vấn dinh dưỡng).';
        else if (mnaScore >= 0 && mnaScore <= 7) assessmentText = 'Suy dinh dưỡng (cần can thiệp dinh dưỡng chuyên sâu).';
        else assessmentText = 'Chưa có thông tin đánh giá dinh dưỡng đầy đủ.';
        
        const summaryNutritionEl = document.getElementById('summaryNutrition');
        if(summaryNutritionEl) summaryNutritionEl.value = `MNA-SF: ${mnaScore} điểm. ${assessmentText}`;
        
        const mnaLis = document.querySelectorAll('#mnaAssessmentSummary li');
        mnaLis.forEach(li => {
            li.style.fontWeight = 'normal'; li.style.backgroundColor = 'transparent';
            if ( (mnaScore >=12 && mnaScore <=14 && li.textContent.includes("12-14 điểm")) ||
                 (mnaScore >=8 && mnaScore <=11 && li.textContent.includes("8-11 điểm")) ||
                 (mnaScore >=0 && mnaScore <=7 && li.textContent.includes("0-7 điểm")) ) {
                li.style.fontWeight = 'bold'; li.style.backgroundColor = '#e8f5e9';
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
        
        const summaryPsychoCognitiveEl = document.getElementById('summaryPsychoCognitive');
        if(summaryPsychoCognitiveEl) summaryPsychoCognitiveEl.value = `GDS-SF: ${gdsScore} điểm. ${assessmentText}`;

        const gdsLis = document.querySelectorAll('#gdsAssessmentSummary li');
        gdsLis.forEach(li => {
            li.style.fontWeight = 'normal'; li.style.backgroundColor = 'transparent';
             if ( (gdsScore >=0 && gdsScore <=4 && li.textContent.includes("0-4 điểm")) ||
                 (gdsScore >=5 && gdsScore <=8 && li.textContent.includes("5-8 điểm")) ||
                 (gdsScore >=9 && gdsScore <=11 && li.textContent.includes("9-11 điểm")) ||
                 (gdsScore >=12 && gdsScore <=15 && li.textContent.includes("12-15 điểm")) ) {
                li.style.fontWeight = 'bold'; li.style.backgroundColor = '#e8f5e9';
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
        if (assistiveDevice === "Có") {
            summary.push(`Sử dụng dụng cụ hỗ trợ: ${assistiveDeviceDetails || 'Có, không rõ loại'}.`);
        } else if (assistiveDevice === "Không") {
             summary.push(`Không sử dụng dụng cụ hỗ trợ đi lại.`);
        }
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
             tugLis.forEach(li => { li.style.fontWeight = 'normal'; li.style.backgroundColor = 'transparent';});
        }
        if (!isNaN(oneLegStandTime)) summary.push(`One-Leg Stand Test: ${oneLegStandTime} giây.`);
        
        const summaryFallRiskEl = document.getElementById('summaryFallRisk');
        if(summaryFallRiskEl) summaryFallRiskEl.value = summary.join(' ');
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
        if (smoking === "Có") {
            summary.push(`Hút thuốc lá: Có${cigarettesPerDay ? ` (${cigarettesPerDay} điếu/ngày)` : ''}.`);
        } else if (smoking === "Đã bỏ") {
            summary.push(`Đã bỏ thuốc lá${quitSmokingTime ? ` (Thời gian: ${quitSmokingTime})` : ''}.`);
        } else if (smoking === "Không bao giờ hút") {
            summary.push(`Không hút thuốc lá.`);
        }
        if (alcohol) {
            let alcoholText = `Uống rượu bia: ${alcohol}.`;
            if (alcoholDetails && alcohol !== "Không bao giờ") alcoholText += ` Lượng: ${alcoholDetails}.`;
            summary.push(alcoholText);
        }
        if (sleepProblem === "Có") {
            summary.push(`Vấn đề giấc ngủ: ${sleepProblemDetails || 'Có, không rõ chi tiết'}.`);
        } else if (sleepProblem === "Không") {
            summary.push(`Không có vấn đề giấc ngủ.`);
        }
        if (socialActivities === "Có") {
            summary.push(`Tham gia hoạt động xã hội: ${socialActivitiesDetails || 'Có, không rõ chi tiết'}.`);
        } else if (socialActivities === "Không") {
            let noSocialText = `Không tham gia hoạt động xã hội.`;
            if (socialActivitiesNoDetails) noSocialText += ` Lý do/khó khăn: ${socialActivitiesNoDetails}.`;
            summary.push(noSocialText);
        }
        if (otherSymptoms === "Có") {
            summary.push(`Triệu chứng khó chịu khác: ${otherSymptomsDetails || 'Có, không rõ chi tiết'}.`);
        } else if (otherSymptoms === "Không") {
            summary.push(`Không có triệu chứng khó chịu khác.`);
        }
        
        const summaryLifestyleEl = document.getElementById('summaryLifestyle');
        if(summaryLifestyleEl) summaryLifestyleEl.value = summary.join(' ');
    }

    function updateAllSummaries() {
        if (!form) return;
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
        if (adlIadlResults && adlIadlResults.adl) {
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
        const summaryElementsToCollect = [
            'summaryBasicInfo', 'summaryChronicDiseases', 'summaryMedicationSense',
            'summaryADLIADL', 'summaryNutrition', 'summaryPsychoCognitive',
            'summaryFallRisk', 'summaryLifestyle'
        ];
        const allSummariesContent = summaryElementsToCollect.map(id => {
            const el = document.getElementById(id);
            return el ? el.value : '';
        }).filter(s => s && s.trim() !== '').join('\n\n');

        const overallSummaryEl = document.getElementById('overallSummary');
        if(overallSummaryEl) overallSummaryEl.value = overallText.trim() + (allSummariesContent ? '\n\n' + allSummariesContent : '');
    }
    // --- Kết thúc các hàm tính điểm và cập nhật Summary ---

    // --- Event Listeners for Form Inputs ---
    const debouncedUpdateAllSummaries = debounce(updateAllSummaries, 400);
    const debouncedSaveFormData = debounce(saveFormDataToLocalStorage, 500);

    form.addEventListener('change', function(event) {
        const target = event.target;
        if (target.type === 'radio' || target.type === 'checkbox' || target.tagName === 'SELECT' || target.type === 'date') {
            updateAllSummaries();
            saveFormDataToLocalStorage();
        }
    });

    form.addEventListener('input', function(event) {
        const target = event.target;
        if ( (target.tagName === 'INPUT' && (target.type === 'text' || target.type === 'number' || target.type === 'tel')) || 
             target.tagName === 'TEXTAREA' ) {
            debouncedUpdateAllSummaries();
            debouncedSaveFormData();
        }
    });
    // --- Kết thúc Event Listeners ---

    // Initial setup calls
    loadFormDataFromLocalStorage(); 
    if (!localStorage.getItem(LOCAL_STORAGE_KEY)) {
        calculateAndDisplayBmi(); 
        updateAllSummaries();
    }
});
