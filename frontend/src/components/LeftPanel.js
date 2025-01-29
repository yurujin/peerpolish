import React, { useState, useEffect } from "react";
import { Worker, Viewer } from "@react-pdf-viewer/core";
import { searchPlugin } from "@react-pdf-viewer/search";
import { zoomPlugin } from "@react-pdf-viewer/zoom";
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/search/lib/styles/index.css";
import "@react-pdf-viewer/zoom/lib/styles/index.css";
import axios from "axios";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;

function LeftPanel({ onFileSelect, onPdfPreview, pdfUrl, highlightedReferences, activeTab }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchText, setSearchText] = useState(""); // 用于高亮的原文句子
  const [originalTextByPage, setOriginalTextByPage] = useState([]); // 存储每一页的原文文本

  const zoomPluginInstance = zoomPlugin();
  const { ZoomIn, ZoomOut, ZoomPopover } = zoomPluginInstance;

  const searchPluginInstance = searchPlugin();
  const { setTargetPages } = searchPluginInstance;

  // 清理文本：去空格、去符号、转换为小写
  const sanitizeText = (text) =>
    text
      .replace(/\[\d+(,\s*\d+)*\]/g, "") // 移除引用标注，比如 [6], [12, 15]
      .replace(/[-–—\s]+/g, "") // 移除所有空格和连字符
      .replace(/[.,?!;:"'()_\-{}<>~`@#$%^&*|/]/g, "") // 移除所有标点符号
      .toLowerCase(); // 转换为小写

  // 提取 PDF 的原文文本
  const extractOriginalText = async () => {
    if (!pdfUrl) {
      console.warn("PDF URL is missing.");
      return;
    }

    const pdfDoc = await pdfjsLib.getDocument(pdfUrl).promise;
    const textByPage = [];

    for (let i = 0; i < pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i + 1);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item) => item.str).join(" ");
      textByPage.push({ pageIndex: i, text: pageText });
    }

    setOriginalTextByPage(textByPage);
  };

  // 匹配 reference 并返回原文句子
  const matchReferences = () => {
    if (!highlightedReferences || !originalTextByPage.length) {
      console.warn("Highlighted references or original text is missing.");
      return;
    }

    let matchedSentences = [];

    highlightedReferences.forEach((ref) => {
      const sanitizedRef = sanitizeText(ref.reference);

      originalTextByPage.forEach((page) => {
        const sanitizedPageText = sanitizeText(page.text);
        const startIndex = sanitizedPageText.indexOf(sanitizedRef);

        if (startIndex !== -1) {
          // 找到匹配的原文句子
          const originalSentence = page.text.substring(
            startIndex,
            startIndex + ref.reference.length
          );
          matchedSentences.push(originalSentence);
        }
      });
    });

    // 将匹配的原文句子拼接成搜索文本
    if (matchedSentences.length > 0) {
      setSearchText(matchedSentences.join(" "));
    }
  };

  // 动态提取原文文本并匹配 reference
  useEffect(() => {
    const updateTextAndMatch = async () => {
      if (activeTab === "section" && pdfUrl && highlightedReferences?.length > 0) {
        await extractOriginalText();
        matchReferences();
      }
    };

    updateTextAndMatch();
  }, [activeTab, pdfUrl, highlightedReferences]);

  // 文件上传逻辑
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
                <div style={{ height: "750px" }}>
                  <Viewer
                    fileUrl={pdfUrl}
                    plugins={[zoomPluginInstance, searchPluginInstance]}
                    defaultScale={1}
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