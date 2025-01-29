import React, { useState, useEffect } from "react";
import { Worker, Viewer } from "@react-pdf-viewer/core";
import "@react-pdf-viewer/core/lib/styles/index.css";
import { zoomPlugin } from "@react-pdf-viewer/zoom";
import "@react-pdf-viewer/zoom/lib/styles/index.css";
import { searchPlugin } from "@react-pdf-viewer/search";  // 使用搜索插件
import "@react-pdf-viewer/search/lib/styles/index.css";
import axios from "axios";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;

function LeftPanel({ onFileSelect, onPdfPreview, pdfUrl, highlightedReferences, activeTab }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [matchedSentences, setMatchedSentences] = useState([]);  // 存储找到的原文句子

  const zoomPluginInstance = zoomPlugin();
  const { ZoomIn, ZoomOut, ZoomPopover } = zoomPluginInstance;

  // ✅ **创建 `searchPlugin` 插件**
  const searchPluginInstance = searchPlugin();
  const { highlight } = searchPluginInstance;

  // ✅ **清理文本，去掉标点、空格等**
  const sanitizeText = (text) =>
    text
      .replace(/\[\d+(,\s*\d+)*\]/g, "") // 移除引用标注，比如 [6], [12, 15]
      .replace(/[-–—\s]+/g, "") // 移除所有空格和连字符
      .replace(/[.,?!;:"'()_\-{}<>~`@#$%^&*|/]/g, "") // 移除所有标点符号
      .toLowerCase(); // 转换为小写

  // ✅ **匹配原文句子 & 触发搜索插件高亮**
  const findMatchingSentences = async () => {
    if (!pdfUrl || !highlightedReferences) {
      console.warn("PDF URL or highlightedReferences is missing.");
      return;
    }

    const pdfDoc = await pdfjsLib.getDocument(pdfUrl).promise;
    console.log("PDF document loaded:", pdfDoc);

    const foundSentences = [];  // 存储匹配的原文句子
    const searchQueries = [];   // 存储传给 `searchPlugin` 的关键词

    // ✅ **提取 PDF 文本**
    for (let i = 0; i < pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i + 1);
      const textContent = await page.getTextContent();

      const originalSentences = textContent.items.map((item) => item.str); // 提取原始文本
      const cleanedText = sanitizeText(originalSentences.join(" ")); // 清理后的文本

      console.log(`Processing page ${i + 1}:`, cleanedText);

      // ✅ **在页面中查找每个引用**
      highlightedReferences.forEach((ref) => {
        const sanitizedRef = sanitizeText(ref.reference);
        const matchIndex = cleanedText.indexOf(sanitizedRef);

        if (matchIndex !== -1) {
          console.log(`Found reference on page ${i + 1}:`, ref.reference);

          // ✅ **找到原文句子（去掉格式化）**
          const matchedSentence = originalSentences.find((sentence) =>
            sanitizeText(sentence).includes(sanitizedRef)
          );

          if (matchedSentence) {
            console.log(`Original sentence found:`, matchedSentence);
            foundSentences.push(matchedSentence);
            searchQueries.push(ref.reference);  // 用未格式化的原文作为搜索关键词
          }
        }
      });
    }

    setMatchedSentences(foundSentences);  // 存储匹配的原文句子
    console.log("Matched Sentences:", foundSentences);

    // ✅ **触发搜索插件高亮**
    if (searchQueries.length > 0) {
      console.log("Highlighting with searchPlugin:", searchQueries);
      await highlight(searchQueries);
    } else {
      console.warn("No matches found, skipping highlighting.");
    }
  };

  // ✅ **监听 `pdfUrl` 和 `highlightedReferences` 变化**
  useEffect(() => {
    if (activeTab === "section" && pdfUrl && highlightedReferences?.length > 0) {
      findMatchingSentences();
    }
  }, [activeTab, pdfUrl, highlightedReferences]);

  // ✅ **文件上传逻辑**
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
                    plugins={[
                      zoomPluginInstance,
                      searchPluginInstance, // ✅ 使用 `searchPlugin` 进行高亮
                    ]}
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
