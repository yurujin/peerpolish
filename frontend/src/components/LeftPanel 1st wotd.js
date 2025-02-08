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
  const { highlight, clearHighlights, setTargetPages } = searchPluginInstance;

  const [rawTextByPage, setRawTextByPage] = useState([]); // 原始 PDF 文本
  const [sanitizedTextByPage, setSanitizedTextByPage] = useState([]); // 清理后的 PDF 文本


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
    const rawTextArray = [];
    const sanitizedTextArray = [];

    for (let i = 0; i < pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i + 1);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item) => item.str).join(" "); // 拼接成整页文本

        rawTextArray.push({ pageIndex: i, text: pageText }); // 存入原始文本数组
        sanitizedTextArray.push({ pageIndex: i, text: sanitizeText(pageText) }); // 存入清理后的文本数组
    }

    setOriginalTextByPage(rawTextArray); // 旧的存储
    setRawTextByPage(rawTextArray); // 新增存储原始文本
    setSanitizedTextByPage(sanitizedTextArray); // 存储清理后的文本

    // 调试输出
    console.log("🔹 原始 PDF 文本（数组）:", rawTextArray);
    console.log("🔹 清理后的 PDF 文本（数组）:", sanitizedTextArray);
};

  // 匹配 reference 并返回原文句子
  const matchReferences = () => {
    if (!highlightedReferences || !originalTextByPage.length) {
        console.warn("Highlighted references or original text is missing.");
        return;
    }

    console.log("🔎 开始匹配参考文献...");
    let matchedResults = [];

    highlightedReferences.forEach((ref) => {
        const sanitizedRef = sanitizeText(ref.reference);
        const originalRef = ref.reference; // 记录未处理的原文 reference

        console.log(`📖 处理参考文献: "${originalRef}" (清理后: "${sanitizedRef}")`);

        originalTextByPage.forEach((page) => {
            const sanitizedPageText = sanitizeText(page.text);
            const startIndex = sanitizedPageText.indexOf(sanitizedRef);

            if (startIndex !== -1) {
                console.log(`✅ 在第 ${page.pageIndex + 1} 页找到匹配！`);
                matchedResults.push({
                    pageIndex: page.pageIndex,
                    originalReference: originalRef
                });
            }
        });
    });

    console.log("🔹 参考文献匹配结果:", matchedResults);
    extractSentenceFromPDF(matchedResults); // ✅ 继续下一步，查找完整句子
};


const extractSentenceFromPDF = (matchedResults) => {
  if (!matchedResults.length || !originalTextByPage.length) {
    console.warn("⚠️ 没有匹配结果，跳过句子提取！");
    return;
  }

  console.log("📖 开始提取完整原文句子...");
  let sentenceMatches = [];

  matchedResults.forEach((match) => {
      const { pageIndex, originalReference } = match;
      const firstWord = originalReference.split(" ")[0].replace(/[^\w]/g, ""); 
      const lastWord = originalReference.split(" ").slice(-1)[0].replace(/[^\w]/g, "");
      
      console.log(`🔍 参考文献: "${originalReference}"`);
      console.log(`➡️ 查找第一个词: "${firstWord}"`);
      console.log(`➡️ 查找最后一个词: "${lastWord}"`); 

      const pageText = originalTextByPage.find(page => page.pageIndex === pageIndex)?.text || "did not found pagenumber";
      if (!pageText.includes(firstWord)) {console.warn(`❌ 第 ${pageIndex + 1} 页未找到 "${firstWord}"`); return;}

      // ✅ 找到 `firstWord` 的位置
      let firstIndex = pageText.indexOf(firstWord);
      while (firstIndex !== -1) { 
        let searchEndIndex = firstIndex + (originalReference.length * 2); // 搜索范围
        let searchArea = pageText.substring(firstIndex, searchEndIndex);
        let lastIndex = searchArea.lastIndexOf(lastWord) + firstIndex; 
  
        console.log(`✅ "${firstWord}" 位置: ${firstIndex}`);
        console.log(`🔎 搜索范围结束位置: ${searchEndIndex}`);
        console.log(`🔍 搜索范围: "${searchArea}"`);
        console.log(`✅ "${lastWord}" 位置: ${lastIndex}`);
  
        if (lastIndex !== -1 && lastIndex > firstIndex) {
          let extractedSentence = pageText.substring(firstIndex, lastIndex + lastWord.length);
          console.log(`📜 提取完整句子: "${extractedSentence}"`);
          sentenceMatches.push({ pageIndex, extractedSentence });
          break; // ✅ 找到 `lastWord`，结束搜索
        } else {
          // **未找到 `lastWord`，继续向后搜索新的 `firstWord`**
          firstIndex = pageText.indexOf(firstWord, firstIndex + 1);
          console.warn(`⚠️ 在当前位置找不到完整匹配，继续查找下一个 "${firstWord}"`);
        }
      }
  
      if (firstIndex === -1) {
        console.warn(`⚠️ 无法在第 ${pageIndex + 1} 页找到完整匹配`);
      }
    });
  
    console.log("🔍 提取出的原文句子:", sentenceMatches);
    highlightInPDF(sentenceMatches);
  };

const highlightInPDF = (sentenceMatches) => {
  if (!sentenceMatches.length) {console.warn("⚠️ 没有句子需要高亮！");return;}

  let searchTerms = sentenceMatches.map(match => match.extractedSentence);
  console.log("🔆 高亮以下文本:", searchTerms);
  console.log("📌 检查 searchTerms 是否为空:", JSON.stringify(searchTerms, null, 2));

  searchTerms.forEach(term => {
    console.log(`🟢 触发单独高亮:`, term);
    highlight(term);  // 这里每次单独调用 highlight 方法
  });
};

// 监听 PDF 变化 & 触发文本提取
useEffect(() => {
  if (pdfUrl) extractOriginalText();
}, [pdfUrl]);

// 监听参考文献变化 & 触发匹配
useEffect(() => {
  if (highlightedReferences.length) matchReferences();
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