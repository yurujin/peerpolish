import React, { useState } from "react";
import { Worker, Viewer } from "@react-pdf-viewer/core";
import "@react-pdf-viewer/core/lib/styles/index.css";
import mammoth from "mammoth";

function LeftPanel() {
  const [fileType, setFileType] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [wordContent, setWordContent] = useState(null);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const fileExtension = file.type;
    setFileType(fileExtension);

    if (fileExtension === "application/pdf") {
      const pdfBlobUrl = URL.createObjectURL(file);
      setPdfUrl(pdfBlobUrl);
    }

    if (fileExtension === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const result = await mammoth.extractRawText({ arrayBuffer: e.target.result });
          setWordContent(result.value);
        } catch (error) {
          console.error("Error reading Word file:", error);
          setWordContent("Failed to read Word document.");
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  return (
    <section className="left-panel">
      <div className="upload-section">
        <h2>Upload Your Article</h2>
        <div className="upload-box">
          <input type="file" accept=".pdf, .docx" onChange={handleFileUpload} />
          <button className="upload-btn">Upload</button>
        </div>
      </div>

      <div className="article-viewer">
        <h2>Article Preview</h2>
        <div id="article-preview" className="content-preview">
          {fileType === "application/pdf" && pdfUrl && (
            <Worker workerUrl={`https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`}>
              <Viewer fileUrl={pdfUrl} />
            </Worker>
          )}
          {fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" && wordContent && (
            <div>
              <pre>{wordContent}</pre>
            </div>
          )}
          {!fileType && <p>Your uploaded article will appear here...</p>}
        </div>
      </div>
    </section>
  );
}

export default LeftPanel;
