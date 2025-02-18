import React, { useState, useEffect ,useRef} from "react";
import { Worker, Viewer } from "@react-pdf-viewer/core";
import { highlightPlugin, RenderHighlightsProps } from "@react-pdf-viewer/highlight";
import { zoomPlugin } from "@react-pdf-viewer/zoom";
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/highlight/lib/styles/index.css";
import "@react-pdf-viewer/zoom/lib/styles/index.css";
import axios from "axios";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;

function LeftPanel({ onFileSelect, onPdfPreview, pdfUrl, highlightedReferences, jumpTarget,activeTab }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [highlights, setHighlights] = useState([]); 

  

  const zoomPluginInstance = zoomPlugin();
  const { ZoomIn, ZoomOut, ZoomPopover } = zoomPluginInstance;

  const jumpToHighlightAreaRef = useRef(() => {});
  const [cachedHighlights, setCachedHighlights] = useState([]);



  const calculateHighlights = async (pdfUrl, references) => {
    if (!pdfUrl || !references || references.length === 0) return;

    const pdfDoc = await pdfjsLib.getDocument(pdfUrl).promise;
    let foundHighlights = [];


    for (let pageIndex = 0; pageIndex < pdfDoc.numPages; pageIndex++) {

      const page = await pdfDoc.getPage(pageIndex + 1);
      const textContent = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1 });

      let fullText = "";
      const itemRanges = [];
      textContent.items.forEach((item, itemIndex) => {
        itemRanges.push({
          start: fullText.length,
          end: fullText.length + item.str.length,
          item,
          itemIndex, 
        });
        fullText += item.str; 
      });


      references.forEach((ref) => {
        const cleanFullText = fullText
          .replace(/[^a-zA-Z]/g, "") // 移除所有非单词字符
          .toLowerCase();        // 转换为全小写
          const cleanSearchText = ref.reference
          .replace(/[^a-zA-Z]/g, '') // 移除非字母字符
          .toLowerCase();


        let matchStart = cleanFullText.indexOf(cleanSearchText);
    
        while (matchStart !== -1) {
          const matchEnd = matchStart + cleanSearchText.length;

          let originalStart = -1;
          let originalEnd = -1;
          let currentCleanIndex = 0;

          for (let i = 0; i < fullText.length; i++) {
            if (/[a-zA-Z]/.test(fullText[i])) {  
              if (currentCleanIndex === matchStart) {
                originalStart = i;
              }
              if (currentCleanIndex === matchEnd - 1) {
                originalEnd = i + 1;
                break;
              }
              currentCleanIndex++;
            }
          }



          if (originalStart !== -1 && originalEnd !== -1) {

            const matchingItems = itemRanges.filter(
              (range) => range.end > originalStart && range.start < originalEnd
            );

            matchingItems.forEach((range) => {
              const item = range.item;
              const itemStart = Math.max(originalStart, range.start);
              const itemEnd = Math.min(originalEnd, range.end);

              const highlightStart = itemStart - range.start;
              const highlightEnd = itemEnd - range.start;

              const highlightWidth = (highlightEnd - highlightStart) / item.str.length * item.width;

              const x = item.transform[4] + (highlightStart / item.str.length) * item.width;

              const y = viewport.height - item.transform[5] - item.height;

              const highlightArea = {
                pageIndex,
                left: (x / viewport.width) * 100,
                top: (y / viewport.height) * 100,
                width: (highlightWidth / viewport.width) * 100,
                height: (item.height / viewport.height) * 100,
              };


              foundHighlights.push({
                ...highlightArea,
                referenceText: ref.reference, // 添加参考文本
              });
            });
          }

          matchStart = cleanFullText.indexOf(cleanSearchText, matchEnd);

        }
      });
    }


    setHighlights(foundHighlights);
    setCachedHighlights(foundHighlights); 
    console.log("Cached highlights updated:", foundHighlights);
  };

  const renderHighlights = (props) => (
    
    <div>
      {highlights
        .filter((area) => area.pageIndex === props.pageIndex)
        .map((area, idx) => (
          <div
            key={idx}
            style={Object.assign(
              {},
              {
                background: activeTab === "section" ? "green" : "#3B82F6",
                opacity: 0.4,
              },
              props.getCssProperties(area, props.rotation)
            )}
          />
        ))}
    </div>
  );

  const highlightPluginInstance = highlightPlugin({ renderHighlights });
  jumpToHighlightAreaRef.current = highlightPluginInstance.jumpToHighlightArea;
  


  useEffect(() => {
    if (
      (activeTab === "section" || activeTab === "criteria") && 
      pdfUrl &&
      highlightedReferences &&
      highlightedReferences.length > 0
    ) {
      calculateHighlights(pdfUrl, highlightedReferences);
    } else {
      setHighlights([]); 
    }
  }, [pdfUrl, highlightedReferences, activeTab]);

  useEffect(() => {
    if (!jumpTarget  || cachedHighlights.length === 0) {
      console.log("跳转条件不满足:", { jumpTarget,  cachedHighlights });
      return;
    }
  
    console.log("开始处理跳转:", jumpTarget);
    
    // 精确匹配逻辑
    const target = cachedHighlights.find(h => 
      h.referenceText.trim() === jumpTarget.trim()
    );
  
    if (target) {
      console.log("找到匹配高亮区域:", target);
      
      // 确保目标页面已加载

        jumpToHighlightAreaRef.current(target);
        

    } else {
      console.warn("未找到匹配的高亮区域");
      console.log("当前缓存的高亮数据:", cachedHighlights);
    }
  }, [jumpTarget, cachedHighlights]);

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