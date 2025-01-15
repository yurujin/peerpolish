import React, { useState } from "react";
import LeftPanel from "./components/LeftPanel";
import RightPanel from "./components/RightPanel";
import Header from "./components/Header";
import Footer from "./components/Footer";
import "./App.css";

function App() {
  const [selectedFile, setSelectedFile] = useState(null); // 保存选中的文件
  const [pdfUrl, setPdfUrl] = useState(null);

  const handleFileSelect = (file) => {
    console.log("File selected in LeftPanel:", file); // 调试日志
    setSelectedFile(file); // 更新选中的文件状态
  };

  const handlePdfPreview = (url) => {
    setPdfUrl(url); // 更新 PDF URL
  };

  return (
    <div>
      <Header />
      <main className="main-layout">
        {/* 将回调函数传递给 LeftPanel */}
        <LeftPanel
          onFileSelect={handleFileSelect}
          onPdfPreview={handlePdfPreview}
          pdfUrl={pdfUrl}
        />
        {/* 将文件传递给 RightPanel */}
        <RightPanel file={selectedFile} />
      </main>
      <Footer />
    </div>
  );
}

export default App;
