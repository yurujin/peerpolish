import React, { useState, useEffect } from "react";
import { Worker, Viewer } from "@react-pdf-viewer/core";
import "@react-pdf-viewer/core/lib/styles/index.css";
import { zoomPlugin } from "@react-pdf-viewer/zoom";
import "@react-pdf-viewer/zoom/lib/styles/index.css";
import { highlightPlugin } from "@react-pdf-viewer/highlight";
import "@react-pdf-viewer/highlight/lib/styles/index.css";
import axios from "axios";

import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;



function LeftPanel({ onFileSelect, onPdfPreview, pdfUrl, highlightedReferences, activeTab }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notes, setNotes] = useState([]); 


  const zoomPluginInstance = zoomPlugin();
  const { ZoomIn, ZoomOut, ZoomPopover } = zoomPluginInstance;

  const sanitizeText = (text) =>
    text
      .replace(/\[\d+(,\s*\d+)*\]/g, "") // 移除引用标注，比如 [6], [12, 15]
      .replace(/[-–—\s]+/g, "") // 移除所有空格和连字符
      .replace(/[.,?!;:"'()_\-{}<>~`@#$%^&*|/]/g, "") // 移除所有标点符号（移除了不必要的转义符）
      .toLowerCase(); // 转换为小写

  
      const generateNotesFromReferences = async () => {
        if (!pdfUrl || !highlightedReferences) {
          console.warn("PDF URL or highlightedReferences is missing.");
          return [];
        }
      
        const pdfDoc = await pdfjsLib.getDocument(pdfUrl).promise;
        console.log("PDF document loaded:", pdfDoc);
      
        const pdfTextByPage = [];
      
        // 提取每一页的文本并构造字符数组
        for (let i = 0; i < pdfDoc.numPages; i++) {
          console.log(`Processing page ${i + 1}`);
          const page = await pdfDoc.getPage(i + 1);
          const textContent = await page.getTextContent();
          const viewport = page.getViewport({ scale: 1 });
      
          const charArray = [];
          let cleanedPageText = "";
      
          textContent.items.forEach((item) => {
            const chars = item.str.split("");
            chars.forEach((char, index) => {
              const charInfo = {
                char,
                left: item.transform[4] + index * (item.width / item.str.length),
                top: viewport.height - item.transform[5],
                width: item.width / item.str.length,
                height: item.height,
                pageIndex: i,
              };
              charArray.push(charInfo);
              cleanedPageText += sanitizeText(char);
            });
          });
      
          console.log(`Original text content items for page ${i + 1}:`, textContent.items);
          console.log(`Cleaned page text for page ${i + 1}:`, cleanedPageText);
          console.log(`Character array for page ${i + 1}:`, charArray);
      
          pdfTextByPage.push({ pageIndex: i, charArray, cleanedPageText });
        }
      
        const notes = highlightedReferences.map((ref, refIndex) => {
          const sanitizedRef = sanitizeText(ref.reference);
          console.log(`Processing reference: "${ref.reference}" (sanitized: "${sanitizedRef}")`);
      
          let found = false;
          for (const { pageIndex, charArray, cleanedPageText } of pdfTextByPage) {
            const startIndex = cleanedPageText.indexOf(sanitizedRef);
      
            if (startIndex !== -1) {
              console.log(
                `Reference "${ref.reference}" (sanitized: "${sanitizedRef}") found on page ${pageIndex + 1} at index ${startIndex}`
              );
              found = true;
      
              let matchStart = -1;
              let matchEnd = -1;
              let currentIndex = 0;
      
              for (let i = 0; i < charArray.length; i++) {
                const char = sanitizeText(charArray[i].char);
                if (currentIndex === startIndex) matchStart = i;
                if (currentIndex === startIndex + sanitizedRef.length - 1) {
                  matchEnd = i;
                  break;
                }
                currentIndex += char.length;
              }
      
              console.log(`Match start index: ${matchStart}, match end index: ${matchEnd}`);
              if (matchStart !== -1 && matchEnd !== -1) {
                const startChar = charArray[matchStart];
                const endChar = charArray[matchEnd];
                console.log(`Start char info:`, startChar);
                console.log(`End char info:`, endChar);
      
                // 动态计算高亮区域的宽度和高度
                const width = Math.abs(endChar.left + endChar.width - startChar.left);
                const height = Math.max(startChar.height, endChar.height);
      
                console.log(`Highlight area dimensions: width=${width}, height=${height}`);
      
                return {
                  id: `highlight-${refIndex}`,
                  content: ref.reference,
                  highlightAreas: [
                    {
                      pageIndex,
                      left: startChar.left,
                      top: startChar.top,
                      width,
                      height,
                    },
                  ],
                };
              }
            }
          }
      
          if (!found) {
            console.warn(`Reference "${ref.reference}" not found in PDF.`);
          }
          return null;
        });
      
        console.log("Generated notes:", notes.filter(Boolean));
        return notes.filter(Boolean);
      };
      
  // 动态生成高亮区域并更新状态
  useEffect(() => {
    const updateNotes = async () => {
        if (activeTab === "section" && pdfUrl && highlightedReferences?.length > 0) {
            const newNotes = await generateNotesFromReferences();
            if (JSON.stringify(newNotes) !== JSON.stringify(notes)) {
                setNotes(newNotes);
                console.log("Updated notes:", newNotes);
            }
        }
    };

    updateNotes();
}, [activeTab, pdfUrl, highlightedReferences]);




const renderHighlights = (props) => {
  const { pageIndex, scale } = props; // 获取当前页面的缩放比例
  console.log("Current scale:", scale);

  const filteredNotes = notes.filter((note) =>
    note.highlightAreas.some((area) => area.pageIndex === pageIndex)
  );
  console.log("Notes for this page:", filteredNotes);

  if (!Array.isArray(notes)) {
    console.error("Notes is not an array:", notes);
    return null;
  }

  return (
    <div>
      {filteredNotes.map((note) => (
        <React.Fragment key={note.id}>
          {note.highlightAreas
            .filter((area) => area.pageIndex === pageIndex)
            .map((area, idx) => {
              // 根据缩放比例调整高亮区域的坐标和尺寸
              const scaledLeft = area.left * scale;
              const scaledTop = area.top * scale;
              const scaledWidth = area.width * scale;
              const scaledHeight = area.height * scale;

              console.log(`Rendering highlight area ${idx}:`, {
                left: scaledLeft,
                top: scaledTop,
                width: scaledWidth,
                height: scaledHeight,
              });

              return (
                <div
                  key={idx}
                  style={{
                    position: "absolute",
                    background: "yellow",
                    opacity: 0.4,
                    top: `${scaledTop}px`,
                    left: `${scaledLeft}px`,
                    width: `${scaledWidth}px`,
                    height: `${scaledHeight}px`,
                    zIndex: 1,
                  }}
                />
              );
            })}
        </React.Fragment>
      ))}
    </div>
  );
};

  // 动态生成高亮区域并更新状态
  useEffect(() => {
    const updateNotes = async () => {
      if (activeTab === "section" && pdfUrl && highlightedReferences?.length > 0) {
        const newNotes = await generateNotesFromReferences();
        if (JSON.stringify(newNotes) !== JSON.stringify(notes)) {
          setNotes(newNotes);
          console.log("Updated notes:", newNotes);
        }
      }
    };
  
    updateNotes();
  }, [activeTab, pdfUrl, highlightedReferences]);


  const highlightPluginInstance = highlightPlugin({
    renderHighlights,
  });

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
                      highlightPluginInstance
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