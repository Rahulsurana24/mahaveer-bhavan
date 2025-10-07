import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const generateIDCardPDF = async (elementId: string, fileName: string = 'id-card.pdf'): Promise<void> => {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error('Element not found');
    }

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [85.6, 53.98] // Credit card size
    });

    pdf.addImage(imgData, 'PNG', 0, 0, 85.6, 53.98);
    pdf.save(fileName);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF');
  }
};

export const generateReportPDF = async (
  title: string, 
  data: any[], 
  columns: string[]
): Promise<void> => {
  try {
    const pdf = new jsPDF();
    
    // Add title
    pdf.setFontSize(20);
    pdf.text(title, 20, 20);
    
    // Add date
    pdf.setFontSize(12);
    pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 35);
    
    // Add table headers
    let yPosition = 50;
    pdf.setFontSize(10);
    columns.forEach((col, index) => {
      pdf.text(col, 20 + (index * 40), yPosition);
    });
    
    // Add data rows
    data.forEach((row, rowIndex) => {
      yPosition += 10;
      columns.forEach((col, colIndex) => {
        const value = row[col.toLowerCase()] || '';
        pdf.text(String(value), 20 + (colIndex * 40), yPosition);
      });
    });
    
    pdf.save(`${title.toLowerCase().replace(/\s+/g, '-')}.pdf`);
  } catch (error) {
    console.error('Error generating report PDF:', error);
    throw new Error('Failed to generate report PDF');
  }
};