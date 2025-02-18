import React, { useState } from "react";
import LeftPanel from "./components/LeftPanel";
import RightPanel from "./components/RightPanel";
import Header from "./components/Header";
import Footer from "./components/Footer";
import "./App.css";
// import TestPage from "./testpage";


function App() {
  const [selectedFile, setSelectedFile] = useState(null); // 保存选中的文件
  const [pdfUrl, setPdfUrl] = useState(null); // PDF 的 URL
  const [highlightedReferences, setHighlightedReferences] = useState([]); // 高亮引用
  const [activeTab, setActiveTab] = useState("overall"); // 当前激活的 Tab
  const [sectionData, setSectionData] = useState(null); // Section 数据
  const [criteriaData, setCriteriaData] = useState(null); // Criteria 数据

  const [jumpTarget, setJumpTarget] = useState(null);

  // const [isTesting, setIsTesting] = useState(false);

  const handleJumpToReference = (reference) => {
    console.log("[App] Jump target received:", reference); // 调试日志
    setJumpTarget(reference);
  };

  const handleFileSelect = (file) => {
    console.log("File selected in LeftPanel:", file); // 调试日志
    setSelectedFile(file); // 更新选中的文件状态
  };

  const handlePdfPreview = (url) => {
    setPdfUrl(url); // 更新 PDF URL
  };

  // 更新高亮引用的数据
  const handleSetHighlightedReferences = (references) => {
    console.log("Updating highlighted references:", references);
    setHighlightedReferences(references); // 更新高亮引用
  };

  // 设置当前激活的 Tab
  const handleSetActiveTab = (tab) => {
    setActiveTab(tab); // 更新当前激活 Tab
  };

  // 保存后端返回的 Section 和 Criteria 数据
  const handleSetData = (sectionData, criteriaData) => {
    setSectionData(sectionData);
    setCriteriaData(criteriaData);
  };

  return (
    <div>
      <Header />

      {/* <button onClick={() => setIsTesting(!isTesting)}>
                {isTesting ? "return to main page" : "enter into test page"}
      </button>
      {isTesting ? <TestPage /> : <h1>main page</h1>} */}

      <main className="main-layout">
        {/* 将回调函数传递给 LeftPanel */}
        <LeftPanel
          onFileSelect={handleFileSelect}
          onPdfPreview={handlePdfPreview}
          pdfUrl={pdfUrl}
          highlightedReferences={highlightedReferences} // 高亮的引用
          activeTab={activeTab} // 当前激活的 Tab
          jumpTarget={jumpTarget}
        />
        {/* 将文件和数据传递给 RightPanel */}
        <RightPanel
          file={selectedFile}
          sectionData={sectionData}
          criteriaData={criteriaData}
          onSetHighlightedReferences={handleSetHighlightedReferences} // 设置高亮引用的回调
          onSetActiveTab={handleSetActiveTab} // 设置当前 Tab 的回调
          onSetData={handleSetData} // 保存后端返回数据的回调
          onJumpToReference={handleJumpToReference}
        />
      </main>
      <Footer />
    </div>
  );
}

export default App;
