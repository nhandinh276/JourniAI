// src/utils/pdfExporter.js
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/**
 * Xuất PDF bằng cách "chụp" lại phần Lịch trình chi tiết
 * rồi chèn vào PDF dạng ảnh.
 *
 * - Chỉ chụp <section> chứa "🗺️ Lịch trình chi tiết" + các plan-card
 * - Ẩn tất cả nút chức năng (.btn) bên trong section khi chụp
 * - Tiếng Việt giữ nguyên vì render dạng ảnh
 */

export const exportItineraryToPDF = async (itinerary) => {
    // Ưu tiên chụp đúng section chứa Lịch trình chi tiết
    let element = document.querySelector(".itinerary-page section");

    // Nếu vì lý do gì đó không tìm thấy section, fallback lại col-lg-8
    if (!element) {
        element = document.querySelector(".itinerary-page .col-lg-8");
    }

    if (!element) {
        alert("Không tìm thấy phần 'Lịch trình chi tiết' để xuất PDF.");
        return;
    }

    // Ẩn tạm tất cả nút chức năng trong phần lịch trình
    const tempStyle = document.createElement("style");
    tempStyle.setAttribute("data-journi-pdf-style", "true");
    tempStyle.textContent = `
    .itinerary-page section .btn {
      display: none !important;
    }
  `;
    document.head.appendChild(tempStyle);

    try {
        const originalScrollY = window.scrollY;
        window.scrollTo(0, 0);

        // Chụp DOM -> canvas
        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
            windowWidth: document.documentElement.scrollWidth,
            windowHeight: document.documentElement.scrollHeight,
        });

        // Trả lại vị trí cuộn
        window.scrollTo(0, originalScrollY);

        const imgData = canvas.toDataURL("image/png");

        const pdf = new jsPDF("p", "mm", "a4");
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        const margin = 10;
        const pdfWidth = pageWidth - margin * 2;

        const imgWidth = pdfWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        if (imgHeight <= pageHeight - margin * 2) {
            // 1 trang là đủ
            pdf.addImage(imgData, "PNG", margin, margin, imgWidth, imgHeight);
        } else {
            // Chia ảnh thành nhiều đoạn để in nhiều trang
            const canvasPageHeight =
                (canvas.width * (pageHeight - margin * 2)) / imgWidth;
            let renderedHeight = 0;
            let page = 0;

            while (renderedHeight < canvas.height) {
                const pageCanvas = document.createElement("canvas");
                pageCanvas.width = canvas.width;
                pageCanvas.height = Math.min(
                    canvasPageHeight,
                    canvas.height - renderedHeight
                );
                const ctx = pageCanvas.getContext("2d");

                ctx.fillStyle = "#ffffff";
                ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);

                ctx.drawImage(
                    canvas,
                    0,
                    renderedHeight,
                    pageCanvas.width,
                    pageCanvas.height,
                    0,
                    0,
                    pageCanvas.width,
                    pageCanvas.height
                );

                const pageImgData = pageCanvas.toDataURL("image/png");
                const pageImgHeight =
                    (pageCanvas.height * imgWidth) / pageCanvas.width;

                if (page > 0) {
                    pdf.addPage();
                }

                pdf.addImage(
                    pageImgData,
                    "PNG",
                    margin,
                    margin,
                    imgWidth,
                    pageImgHeight
                );

                renderedHeight += canvasPageHeight;
                page++;
            }
        }

        const safeName = (itinerary.name || "hanh-trinh-du-lich").replace(
            /[\\/:*?"<>|]+/g,
            "_"
        );
        pdf.save(`${safeName}.pdf`);
    } catch (err) {
        console.error("Lỗi xuất PDF:", err);
        alert("Xuất PDF thất bại, hãy thử lại sau.");
    } finally {
        // Gỡ style tạm để UI trở lại bình thường
        if (tempStyle.parentNode) {
            tempStyle.parentNode.removeChild(tempStyle);
        }
    }
};
