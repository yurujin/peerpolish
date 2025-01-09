import React, { useState } from "react";

function LeftPanel() {
  const [fileContent, setFileContent] = useState("Your uploaded article will appear here...");

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Read file content
    const reader = new FileReader();
    reader.onload = (e) => {
      if (file.type === "application/pdf") {
        setFileContent("PDF preview not supported here. Display functionality can be extended.");
      } else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        setFileContent("Word document preview not supported here. Display functionality can be extended.");
      } else {
        setFileContent("Unsupported file type.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <section className="left-panel">
      <div className="upload-section">
        <h2>Upload Your Article</h2>
        <div className="upload-box">
          <input type="file" accept=".pdf, .docx" onChange={handleFileUpload} />
          <button className="upload-btn" onClick={() => console.log("Upload button clicked!")}>Upload</button>
        </div>
      </div>
      <div className="article-viewer">
        <h2>Article Preview</h2>
        <div id="article-preview" className="content-preview">
          <p>{fileContent}</p>
        </div>
      </div>
    </section>
  );
}

export default LeftPanel;