import React, { useState } from "react";
import { Worker, Viewer } from "@react-pdf-viewer/core";
import "@react-pdf-viewer/core/lib/styles/index.css";
import axios from "axios"; 


function LeftPanel() {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setError(null);
    setPdfUrl(null);

    if (file.type === "application/pdf") {
      const pdfBlobUrl = URL.createObjectURL(file);
      setPdfUrl(pdfBlobUrl);
      return;
    }

    if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const formData = new FormData();
      formData.append("file", file);

      setLoading(true);

      try {
        const response = await axios.post("http://localhost:8000/upload/", formData, {
          headers: { "Content-Type": "multipart/form-data" },
          responseType: "blob",
        });

        const pdfBlobUrl = URL.createObjectURL(response.data);
        setPdfUrl(pdfBlobUrl);
      } catch (err) {
        console.error("Error converting Word to PDF:", err);
        setError("Failed to convert Word document to PDF.");
      } finally {
        setLoading(false);
      }
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
        {loading && <p>Loading...</p>}
          {error && <p style={{ color: "red" }}>{error}</p>}
          {pdfUrl && (
            <Worker workerUrl={`https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`}>
              <Viewer fileUrl={pdfUrl} />
            </Worker>
          )}
          {!pdfUrl && !loading && !error && <p>Your uploaded article will appear here...</p>}
        </div>
      </div>
    </section>
  );
}

export default LeftPanel;
