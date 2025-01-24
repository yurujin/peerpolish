import React, { useState, useEffect, useCallback} from "react";
import { Worker, Viewer } from "@react-pdf-viewer/core";
import "@react-pdf-viewer/core/lib/styles/index.css";
import { zoomPlugin } from "@react-pdf-viewer/zoom";
import "@react-pdf-viewer/zoom/lib/styles/index.css";
import { searchPlugin } from "@react-pdf-viewer/search";
import "@react-pdf-viewer/search/lib/styles/index.css";
import axios from "axios";
import * as pdfjsLib from "pdfjs-dist";
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;


function LeftPanel({ onFileSelect, onPdfPreview, pdfUrl, highlightedReferences, activeTab }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const zoomPluginInstance = zoomPlugin();
  const { ZoomIn, ZoomOut, ZoomPopover } = zoomPluginInstance;

  const searchPluginInstance = searchPlugin();
  const { highlight, jumpToMatch } = searchPluginInstance; 

  const [highlighted, setHighlighted] = useState(false);


  const sanitizeText = (text) =>
  text
    .replace(/\[\d+(,\s*\d+)*\]/g, "") // 移除引用标注，比如 [6], [12, 15]
    .replace(/[-–—\s]+/g, "") // 移除所有空格和连字符
    .replace(/[.,?!;:"'()_\-{}<>~`@#$%^&*|/]/g, "") // 移除所有标点符号（移除了不必要的转义符）
    .toLowerCase(); // 转换为小写
  
    const extractAndHighlight = useCallback(async () => {
      if (highlighted) {
        console.log("Highlights already applied. Skipping.");
        return;
      }
  
      try {
        const pdfDoc = await pdfjsLib.getDocument(pdfUrl).promise;
        const pdfTextByPage = [];
  
        // 提取每一页文本并清理
        for (let i = 0; i < pdfDoc.numPages; i++) {
          const page = await pdfDoc.getPage(i + 1);
          const textContent = await page.getTextContent();
          const pageText = sanitizeText(
            textContent.items.map((item) => item.str).join(" ")
          );
          pdfTextByPage.push(pageText);
          console.log(`Sanitized text from page ${i + 1}:`, pageText);
        }
  
        // 匹配引用并准备高亮数据
        const highlights = [];
        highlightedReferences.forEach((ref) => {
          const sanitizedRef = sanitizeText(ref.reference);
          let found = false;
  
          pdfTextByPage.forEach((pageText, pageIndex) => {
            if (pageText.includes(sanitizedRef)) {
              console.log(
                `Reference "${sanitizedRef}" found on page ${pageIndex + 1}`
              );
              highlights.push({ keyword: ref.reference });
              found = true;
            }
          });
  
          if (!found) {
            console.warn(`Reference "${sanitizedRef}" not found.`);
          }
        });
  
        // 应用高亮
        if (highlights.length > 0) {
          console.log("Constructed Highlights:", highlights);
          await highlight(highlights);
          console.log("Highlights applied successfully!");
          jumpToMatch(0); // 跳转到第一个匹配
          setHighlighted(true); // 标记高亮完成
        } else {
          console.warn("No highlights to apply.");
        }
      } catch (err) {
        console.error("Error extracting or matching text:", err);
      }
    }, [pdfUrl, highlightedReferences, highlight, jumpToMatch, highlighted]);
  
    useEffect(() => {
      if (pdfUrl && activeTab === "section" && highlightedReferences?.length > 0) {
        console.log("Starting extraction and highlighting process...");
        extractAndHighlight();
      }
    }, [pdfUrl, activeTab, highlightedReferences, extractAndHighlight]);

  // File handling functions remain the same
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);
    onFileSelect(file);
    setError(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Please select a file to upload.");
      return;
    }

    setError(null);

    if (selectedFile.type === "application/pdf") {
      const pdfBlobUrl = URL.createObjectURL(selectedFile);
      onPdfPreview(pdfBlobUrl);
      return;
    }

    if (selectedFile.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      setLoading(true);
      try {
        const formData = new FormData();
        formData.append("file", selectedFile);
        const response = await axios.post("http://localhost:8000/upload/", formData, {
          headers: { "Content-Type": "multipart/form-data" },
          responseType: "blob",
        });
        const pdfBlobUrl = URL.createObjectURL(response.data);
        onPdfPreview(pdfBlobUrl);
      } catch (err) {
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
          <input type="file" accept=".pdf, .docx" onChange={handleFileChange} />
          <button className="upload-btn" onClick={handleUpload}>
            Upload
          </button>
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
              <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
                <div style={{ height: '750px' }}>
                  <Viewer
                    fileUrl={pdfUrl}
                    plugins={[
                      zoomPluginInstance,
                      searchPluginInstance
                    ]}
                  />
                </div>
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