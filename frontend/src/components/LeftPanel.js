import React, { useState } from "react";
import { Worker, Viewer } from "@react-pdf-viewer/core";
import "@react-pdf-viewer/core/lib/styles/index.css";
import { zoomPlugin } from "@react-pdf-viewer/zoom";
import "@react-pdf-viewer/zoom/lib/styles/index.css";
import axios from "axios";

function LeftPanel() {
  const [selectedFile, setSelectedFile] = useState(null); // 保存用户选择的文件
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const zoomPluginInstance = zoomPlugin();
  const { ZoomIn, ZoomOut, ZoomPopover } = zoomPluginInstance;


  const handleFileChange = (event) => {
    // 保存用户选择的文件
    const file = event.target.files[0];
    setSelectedFile(file);
    setPdfUrl(null); // 清除之前的 PDF URL
    setError(null);  // 清除之前的错误信息
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Please select a file to upload."); // 如果没有选择文件，显示错误
      return;
    }

    const file = selectedFile;

    setError(null);
    setPdfUrl(null);

    if (file.type === "application/pdf") {
      // 如果是 PDF 文件，直接显示
      const pdfBlobUrl = URL.createObjectURL(file);
      setPdfUrl(pdfBlobUrl);
      return;
    }

    if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      // 如果是 Word 文件，上传并转换为 PDF
      const formData = new FormData();
      formData.append("file", file);

      setLoading(true);

      try {
        const response = await axios.post("http://localhost:8000/upload/", formData, {
          headers: { "Content-Type": "multipart/form-data" },
          responseType: "blob", // 返回二进制流
        });

        const pdfBlobUrl = URL.createObjectURL(response.data);
        setPdfUrl(pdfBlobUrl);
      } catch (err) {
        console.error("Error converting Word to PDF:", err);
        setError("Failed to convert Word document to PDF.");
      } finally {
        setLoading(false);
      }
    } else {
      setError("Unsupported file type. Please upload a PDF or Word document.");
    }
  };

  return (
    <section className="left-panel">
      <div className="upload-section">
        <h2>Upload Your Article</h2>
        <div className="upload-box">
          {/* 文件选择框 */}
          <input type="file" accept=".pdf, .docx" onChange={handleFileChange} />
          {/* 上传按钮 */}
          <button className="upload-btn" onClick={handleUpload}>Upload</button>
        </div>
      </div>

      <div className="article-viewer">
        <h2>Article Preview</h2>
        <div id="article-preview" className="content-preview">
          {loading && <p>Loading...</p>}
          {error && <p style={{ color: "red" }}>{error}</p>}
          {pdfUrl && (
            <div>
              <div className="toolbar">
                <ZoomIn />
                <ZoomOut />
                <ZoomPopover />
              </div>
              <Worker workerUrl={`https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`}>
                <Viewer fileUrl={pdfUrl} plugins={[zoomPluginInstance]} />
              </Worker>
            </div>
          )}
          {!pdfUrl && !loading && !error && <p>Your uploaded article will appear here...</p>}
        </div>
      </div>
    </section>
  );
}

export default LeftPanel;
