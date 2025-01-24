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
    if (!pdfUrl || !highlightedReferences) return [];

    const pdfDoc = await pdfjsLib.getDocument(pdfUrl).promise;
    const pdfTextByPage = [];

    for (let i = 0; i < pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i + 1);
        const textContent = await page.getTextContent();
        const viewport = page.getViewport({ scale: 1 });

        const pageText = sanitizeText(
            textContent.items.map((item) => item.str).join(" ")
        );

        pdfTextByPage.push({ pageIndex: i, text: pageText, viewport, textContent });
    }

    const notes = highlightedReferences.map((ref, index) => {
        const sanitizedRef = sanitizeText(ref.reference);

        for (const { pageIndex, text, viewport, textContent } of pdfTextByPage) {
            const startIndex = text.indexOf(sanitizedRef);
            if (startIndex !== -1) {
                // 从文本内容中找到起始位置，计算高亮坐标
                const items = textContent.items;
                let charIndex = 0;
                let highlightRect = null;

                for (const item of items) {
                    const itemText = sanitizeText(item.str);
                    if (charIndex + itemText.length > startIndex) {
                        const left = item.transform[4];
                        const top = viewport.height - item.transform[5];
                        const width = viewport.width; // 可根据实际字符宽度计算
                        const height = 10; // 可根据字体高度计算

                        highlightRect = { left, top, width, height };
                        break;
                    }
                    charIndex += itemText.length;
                }

                if (highlightRect) {
                    return {
                        id: `highlight-${index}`,
                        content: ref.reference,
                        highlightAreas: [
                            {
                                pageIndex,
                                ...highlightRect,
                            },
                        ],
                    };
                }
            }
        }

        console.warn(`Reference "${ref.reference}" not found.`);
        return null;
    });

    return notes.filter(Boolean); // 移除未找到的引用
};



  // 动态生成高亮区域并更新状态
  useEffect(() => {
    const updateNotes = async () => {
      if (activeTab === "section" && highlightedReferences?.length > 0) {
        const newNotes = await generateNotesFromReferences();
        setNotes(newNotes);
      } else {
        setNotes([]);
      }
    };

    updateNotes();
  }, [activeTab, highlightedReferences, pdfUrl]);




  const renderHighlights = (props) => {
    if (!Array.isArray(notes)) {
        console.error("Notes is not an array:", notes);
        return null;
    }

    return (
        <div>
            {notes.map((note) => (
                <React.Fragment key={note.id}>
                    {note.highlightAreas
                        .filter((area) => area.pageIndex === props.pageIndex)
                        .map((area, idx) => (
                            <div
                                key={idx}
                                style={{
                                    position: "absolute",
                                    background: "yellow",
                                    opacity: 0.4,
                                    top: `${area.top}px`,
                                    left: `${area.left}px`,
                                    width: `${area.width}px`,
                                    height: `${area.height}px`,
                                }}
                            />
                        ))}
                </React.Fragment>
            ))}
        </div>
    );
};

  const highlightPluginInstance = highlightPlugin({
    renderHighlights,
  });

  
    
  


  // 动态生成高亮区域并更新状态
  useEffect(() => {
    const updateNotes = async () => {
        if (activeTab === "section" && highlightedReferences?.length > 0) {
            const newNotes = await generateNotesFromReferences();
            if (Array.isArray(newNotes)) {
                setNotes(newNotes);
            } else {
                console.error("Generated notes is not an array:", newNotes);
                setNotes([]); // 默认清空
            }
        } else {
            setNotes([]); // 清空高亮
        }
    };

    updateNotes();
}, [activeTab, highlightedReferences, pdfUrl]);

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