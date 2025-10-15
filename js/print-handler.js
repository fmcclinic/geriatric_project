document.addEventListener('DOMContentLoaded', function() {
    const printButton = document.getElementById('printButton');

    if (printButton) {
        printButton.addEventListener('click', function() {
            // Lệnh window.print() sẽ kích hoạt trình duyệt mở hộp thoại in.
            // Việc hiển thị nội dung nào sẽ do file CSS print.css quyết định.
            window.print();
        });
    } else {
        console.error("Không tìm thấy nút 'In Kết Quả' (printButton).");
    }
});