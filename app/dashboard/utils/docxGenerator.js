// app/dashboard/utils/docxGenerator.js
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from "docx";
import { saveAs } from "file-saver";

export const generateDOCX = async (sections, transcript) => {
  const sectionsOrder = ["hpi", "physicalExam", "investigations", "prescription", "assessment"];
  
  const children = [];

  // Title
  children.push(
    new Paragraph({
      text: "Clinical Summary & Transcript",
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );

  // Add sections
  sectionsOrder.forEach((key) => {
    const section = sections[key];
    if (!section) return;

    // Section title
    children.push(
      new Paragraph({
        text: section.title,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 300, after: 200 },
        shading: {
          fill: "E6E6E6",
        },
      })
    );

    // Section content
    const text = section.content && section.content.trim() 
      ? section.content 
      : "Not specified in the transcript.";
    
    // Split content by newlines to preserve formatting
    const lines = text.split('\n');
    lines.forEach(line => {
      children.push(
        new Paragraph({
          text: line,
          spacing: { after: 120 },
        })
      );
    });

    // Add space after section
    children.push(
      new Paragraph({
        text: "",
        spacing: { after: 200 },
      })
    );
  });

  // Transcript section
  children.push(
    new Paragraph({
      text: "Transcript",
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
      shading: {
        fill: "E6E6E6",
      },
    })
  );

  const transcriptText = transcript && transcript.trim() 
    ? transcript 
    : "Transcript will appear here...";
  
  // Split transcript by newlines
  const transcriptLines = transcriptText.split('\n');
  transcriptLines.forEach(line => {
    children.push(
      new Paragraph({
        text: line,
        spacing: { after: 120 },
      })
    );
  });

  // Create document
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: 720,
            right: 720,
            bottom: 720,
            left: 720,
          },
        },
      },
      children: children,
    }],
  });

  // Generate and download
  const blob = await Packer.toBlob(doc);
  saveAs(blob, "ClinicalSummary.docx");
};

export const generateAgendaMinutesDOCX = async (minutes, metadata = {}) => {
  const children = [];

  // Title page
  children.push(
    new Paragraph({
      text: "MEETING MINUTES",
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );

  // Metadata
  if (metadata.meetingName) {
    children.push(
      new Paragraph({
        text: `Meeting: ${metadata.meetingName}`,
        spacing: { after: 120 },
        bold: true,
      })
    );
  }

  children.push(
    new Paragraph({
      text: `Date: ${metadata.date || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
      spacing: { after: 120 },
    })
  );

  children.push(
    new Paragraph({
      text: `Total Agenda Items: ${minutes.length}`,
      spacing: { after: 400 },
    })
  );

  // Helper function to decode HTML entities
  const decodeHtmlEntities = (text) => {
    if (!text) return '';
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  };

  // Process each agenda item
  minutes.forEach((minute, index) => {
    // Agenda number and name
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `AGENDA ${minute.agenda_number}`,
            bold: true,
            size: 28,
          }),
        ],
        spacing: { before: 400, after: 200 },
        border: {
          bottom: {
            color: "000000",
            space: 1,
            style: BorderStyle.SINGLE,
            size: 6,
          },
        },
      })
    );

    children.push(
      new Paragraph({
        text: decodeHtmlEntities(minute.agenda_name),
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 200 },
      })
    );

    // Content section - single combined section
    if (minute.content && minute.content.trim()) {
      const contentText = decodeHtmlEntities(minute.content.trim());
      const contentLines = contentText.split('\n');
      contentLines.forEach(line => {
        children.push(
          new Paragraph({
            text: line,
            spacing: { after: 120 },
          })
        );
      });
    }

    // Add spacing between agenda items (except last)
    if (index < minutes.length - 1) {
      children.push(
        new Paragraph({
          text: "",
          spacing: { after: 300 },
          border: {
            bottom: {
              color: "CCCCCC",
              space: 1,
              style: BorderStyle.SINGLE,
              size: 3,
            },
          },
        })
      );
    }
  });

  // Create document
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: 720,
            right: 720,
            bottom: 720,
            left: 720,
          },
        },
      },
      children: children,
    }],
  });

  // Generate and return blob (don't auto-download)
  const blob = await Packer.toBlob(doc);
  return blob;
};
