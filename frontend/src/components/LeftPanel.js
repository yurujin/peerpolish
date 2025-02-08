import React, { useState, useEffect } from "react";
import { Worker, Viewer } from "@react-pdf-viewer/core";
import { highlightPlugin, RenderHighlightsProps } from "@react-pdf-viewer/highlight";
import { zoomPlugin } from "@react-pdf-viewer/zoom";
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/highlight/lib/styles/index.css";
import "@react-pdf-viewer/zoom/lib/styles/index.css";
import axios from "axios";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;

function LeftPanel({ onFileSelect, onPdfPreview, pdfUrl, highlightedReferences, activeTab }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [originalTextByPage, setOriginalTextByPage] = useState([]); // 存储每一页的原文文本
  const [highlights, setHighlights] = useState([]); // 存储高亮区域

  const zoomPluginInstance = zoomPlugin();
  const { ZoomIn, ZoomOut, ZoomPopover } = zoomPluginInstance;

  const highlightPluginInstance = highlightPlugin();
  const { jumpToHighlightArea } = highlightPluginInstance;

  const extractOriginalText = async () => {
    if (!pdfUrl) return;

    const pdfDoc = await pdfjsLib.getDocument(pdfUrl).promise;
    let rawTextArray = [];

    for (let i = 0; i < pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i + 1);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item) => item.str).join(" ");
        rawTextArray.push({ pageIndex: i, text: pageText });
    }

    setOriginalTextByPage(rawTextArray);
};

  // 计算高亮区域
  const calculateHighlights = async () => {
    if (!highlightedReferences.length || !pdfUrl) return;

    const pdfDoc = await pdfjsLib.getDocument(pdfUrl).promise;
    let foundHighlights = [];

    for (const ref of highlightedReferences) {
        const fullSentence = ref.reference.trim();
        const words = fullSentence.split(" ").map(word => word.replace(/[^\w]/g, "")); // 清理标点
        if (words.length < 3) continue; // 确保有足够的词进行匹配

        const firstThreeWords = words.slice(0, 3).join(" "); // 前三个词
        const firstTwoWords = words.slice(0, 2).join(" "); // 前两个词
        const secondThirdWords = words.slice(1, 3).join(" "); // 第 2、3 词

        console.log(`🔍 目标句: "${fullSentence}"`);
        console.log(`🔹 前三词: "${firstThreeWords}" | 前两词: "${firstTwoWords}" | 第2,3词: "${secondThirdWords}"`);

        for (let pageIndex = 0; pageIndex < originalTextByPage.length; pageIndex++) {
            const pageText = originalTextByPage[pageIndex].text;

            if (pageText.includes(firstThreeWords) || pageText.includes(firstTwoWords) || pageText.includes(secondThirdWords)) {
                console.log(`✅ 在第 ${pageIndex + 1} 页找到匹配！`);

                const page = await pdfDoc.getPage(pageIndex + 1);
                const textContent = await page.getTextContent();
                const viewport = page.getViewport({ scale: 1 });

                textContent.items.forEach((item) => {
                    if (
                        item.str.includes(firstThreeWords) ||
                        item.str.includes(firstTwoWords) ||
                        item.str.includes(secondThirdWords)
                    ) {
                        const { transform, width, height } = item;
                        const x = transform[4];
                        const y = viewport.height - transform[5] - height;

                        const highlightArea = {
                            pageIndex,
                            left: (x / viewport.width) * 100,
                            top: (y / viewport.height) * 100,
                            width: (width / viewport.width) * 100,
                            height: (height / viewport.height) * 100,
                        };

                        foundHighlights.push(highlightArea);
                    }
                });
            }
        }
    }

    setHighlights(foundHighlights);
    console.log("🔆 高亮区域:", foundHighlights);
};

// 渲染高亮区域
const renderHighlights = (props) => (
    <div>
        {highlights
            .filter((area) => area.pageIndex === props.pageIndex)
            .map((area, idx) => (
                <div
                    key={idx}
                    style={Object.assign(
                        {},
                        { background: "yellow", opacity: 0.4 },
                        props.getCssProperties(area, props.rotation)
                    )}
                />
            ))}
    </div>
);

// 监听 PDF 变化 & 提取文本
useEffect(() => {
    if (pdfUrl) extractOriginalText();
}, [pdfUrl]);

// 监听参考文献变化 & 触发匹配
useEffect(() => {
    if (highlightedReferences.length) calculateHighlights();
}, [highlightedReferences]);

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
                    plugins={[zoomPluginInstance, highlightPluginInstance]}
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