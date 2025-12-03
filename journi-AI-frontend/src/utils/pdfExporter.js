// src/utils/pdfExporter.js
import jsPDF from "jspdf";

export const exportItineraryToPDF = (itinerary) => {
    const doc = new jsPDF();

    let y = 20;

    doc.setFontSize(18);
    doc.text(itinerary.name || "Hành trình du lịch", 10, y);
    y += 10;

    doc.setFontSize(12);

    (itinerary.days || []).forEach((day) => {
        if (y > 270) {
            doc.addPage();
            y = 20;
        }

        doc.setFont(undefined, "bold");
        doc.text(`Ngày ${day.dayNumber}`, 10, y);
        y += 6;

        doc.setFont(undefined, "normal");
        if (!day.places || day.places.length === 0) {
            doc.text("- Chưa có địa điểm", 14, y);
            y += 6;
        } else {
            day.places.forEach((p) => {
                if (y > 280) {
                    doc.addPage();
                    y = 20;
                }
                doc.text(
                    `• ${p.time || ""} ${p.name || ""} - ${p.description || ""}`,
                    14,
                    y
                );
                y += 6;
            });
        }

        y += 4;
    });

    doc.save(`${itinerary.name || "itinerary"}.pdf`);
};
