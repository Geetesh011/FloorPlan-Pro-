import { jsPDF } from 'jspdf';
import { FURNITURE_CATALOG } from '../data/furnitureCatalog';

/**
 * Formats a date string (e.g., 12 Jul 2026).
 */
function getFormattedDate() {
  return new Date().toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

export async function exportAsImage(projectName = 'Project', dataUrl) {
  try {
    const link = document.createElement('a');
    link.download = `floorplan-pro-${projectName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  } catch (error) {
    console.error('Image Export Error:', error);
    throw error;
  }
}

export async function exportAsPDF(projectName = 'Project', placedFurniture = [], doors = [], dataUrl) {
  try {
    
    // Create new PDF (portrait, points, letter format)
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'letter'
    });

    const margin = 50;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // ── 1. HEADER ──
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(26);
    doc.setTextColor(15, 23, 42); // Slate 900
    doc.text('FloorPlan Pro', margin, margin + 20);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139); // Slate 500
    doc.text('Prepared with FloorPlan Pro', margin, margin + 38);

    // Project Name and Date right aligned
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139);
    const dateStr = getFormattedDate();
    const rightAlign = pageWidth - margin;
    doc.text(dateStr, rightAlign, margin + 20, { align: 'right' });
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59); // Slate 800
    doc.text(projectName, rightAlign, margin + 38, { align: 'right' });

    // Subtle line separator
    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.setLineWidth(1);
    doc.line(margin, margin + 55, pageWidth - margin, margin + 55);

    // ── 2. IMAGE (Room Layout) ──
    const maxImgWidth = pageWidth - (margin * 2);
    const maxImgHeight = 400;
    
    const imgProps = doc.getImageProperties(dataUrl);
    const ratio = imgProps.width / imgProps.height;
    
    let imgWidth = maxImgWidth;
    let imgHeight = imgWidth / ratio;

    if (imgHeight > maxImgHeight) {
      imgHeight = maxImgHeight;
      imgWidth = imgHeight * ratio;
    }

    const imgX = (pageWidth - imgWidth) / 2;
    const imgY = margin + 75;
    
    // Light background tint/card for the image
    const pad = 10;
    doc.setFillColor(248, 250, 252); // Slate 50
    doc.rect(imgX - pad, imgY - pad, imgWidth + (pad * 2), imgHeight + (pad * 2), 'F');
    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.setLineWidth(1);
    doc.rect(imgX - pad, imgY - pad, imgWidth + (pad * 2), imgHeight + (pad * 2), 'S');
    
    // Draw the actual image
    doc.addImage(dataUrl, 'PNG', imgX, imgY, imgWidth, imgHeight);

    // ── 3. BUDGET BREAKDOWN ──
    let currentY = imgY + imgHeight + pad + 50;
    
    // Ensure we don't overflow the page
    if (currentY > pageHeight - 150) {
      doc.addPage();
      currentY = margin + 20;
    }
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42); // Slate 900
    doc.text('Budget Breakdown', margin, currentY);
    
    currentY += 25;

    // Table Header (with background shade)
    doc.setFillColor(241, 245, 249); // Slate 100
    doc.rect(margin, currentY - 20, pageWidth - (margin * 2), 32, 'F');
    
    // Top border for table header
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(1);
    doc.line(margin, currentY - 20, pageWidth - margin, currentY - 20);
    doc.line(margin, currentY + 12, pageWidth - margin, currentY + 12);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105); // Slate 600
    doc.text('ITEM DESCRIPTION', margin + 10, currentY);
    doc.text('CATEGORY', margin + 250, currentY);
    doc.text('AMOUNT', pageWidth - margin - 10, currentY, { align: 'right' });

    currentY += 20;

    // Table Rows
    let totalEstimate = 0;
    let rowCount = 0;
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85); // Slate 700

    const fmtPrice = (price) => `$${price.toFixed(2)}`;
    const itemsList = [...placedFurniture.map(f => ({...f, isDoor: false})), ...doors.map(d => ({...d, isDoor: true}))];

    itemsList.forEach((item) => {
      // Check for page overflow
      if (currentY > pageHeight - 100) {
        doc.addPage();
        currentY = margin + 20;
      }

      // Alternating row shading
      if (rowCount % 2 === 1) {
        doc.setFillColor(248, 250, 252); // Slate 50
        doc.rect(margin, currentY - 20, pageWidth - (margin * 2), 32, 'F');
      }

      let itemName = '';
      let category = '';
      let price = 0;

      if (item.isDoor) {
        const doorLabels = { 'single-left': 'Single Left Door', 'single-right': 'Single Right Door', 'double': 'Double Door', 'sliding': 'Sliding Door' };
        itemName = doorLabels[item.type] || 'Door';
        category = 'Doors';
        price = item.type === 'sliding' ? 220 : item.type === 'double' ? 280 : 150;
      } else {
        const catalogItem = FURNITURE_CATALOG.find((c) => c.id === item.catalogId);
        itemName = item.name;
        category = catalogItem?.category ?? 'Other';
        price = item.customPrice ?? item.price;
      }

      doc.setTextColor(51, 65, 85); // Slate 700 for text
      doc.text(itemName, margin + 10, currentY);
      doc.text(category, margin + 250, currentY);
      
      doc.setTextColor(4, 120, 87); // Emerald 700 for money
      doc.text(fmtPrice(price), pageWidth - margin - 10, currentY, { align: 'right' });
      
      totalEstimate += price;
      currentY += 32;
      rowCount++;
    });

    if (itemsList.length === 0) {
      doc.setTextColor(148, 163, 184);
      doc.text('No items placed in room.', margin + 10, currentY);
      currentY += 32;
    }

    // Bottom border for table
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, currentY - 20, pageWidth - margin, currentY - 20);

    // Total Estimate section (distinct visual weight)
    currentY += 10;
    doc.setDrawColor(4, 120, 87); // Emerald 700 for the total line
    doc.setLineWidth(1.5);
    doc.line(pageWidth - margin - 200, currentY, pageWidth - margin, currentY);
    currentY += 30;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(4, 120, 87); // Emerald 700
    doc.text('Total Estimate:', pageWidth - margin - 100, currentY, { align: 'right' });
    
    doc.setFontSize(16); // Make total amount pop
    doc.text(fmtPrice(totalEstimate), pageWidth - margin - 10, currentY, { align: 'right' });

    // ── 4. FOOTER ──
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184); // Slate 400
      
      const footerY = pageHeight - 25;
      doc.text(`Generated by FloorPlan Pro — ${dateStr}`, margin, footerY);
      doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, footerY, { align: 'right' });
    }

    // Download PDF
    doc.save(`floorplan-pro-${projectName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.pdf`);

  } catch (error) {
    console.error('PDF Export Error:', error);
    throw error;
  }
}
