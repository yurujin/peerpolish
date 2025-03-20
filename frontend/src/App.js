import React, { useState, useEffect } from "react";
import LeftPanel from "./components/LeftPanel";
import RightPanel from "./components/RightPanel";
import Header from "./components/Header";
import Footer from "./components/Footer";
import "./App.css";

import { BrowserRouter as Router, Route, Routes, useLocation } from "react-router-dom";
import { initGA, trackPageView } from "./ga"; 


function App() {
  const [selectedFile, setSelectedFile] = useState(null); 
  const [pdfUrl, setPdfUrl] = useState(null); 
  const [highlightedReferences, setHighlightedReferences] = useState([]); 
  const [activeTab, setActiveTab] = useState("overall");
  const [sectionData, setSectionData] = useState(null); 
  const [criteriaData, setCriteriaData] = useState(null); 

  const [jumpTarget, setJumpTarget] = useState(null);

  useEffect(() => {
    initGA(); 
  }, []);

  const handleJumpToReference = (reference) => {
    console.log("[App] Jump target received:", reference); 
    setJumpTarget(reference);
  };

  const handleFileSelect = (file) => {
    console.log("File selected in LeftPanel:", file); 
    setSelectedFile(file); 
  };

  const handlePdfPreview = (url) => {
    setPdfUrl(url);
  };

  const handleSetHighlightedReferences = (references) => {
    console.log("Updating highlighted references:", references);
    setHighlightedReferences(references); 
  };

  const handleSetActiveTab = (tab) => {
    setActiveTab(tab); 
  };

  const handleSetData = (sectionData, criteriaData) => {
    setSectionData(sectionData);
    setCriteriaData(criteriaData);
  };

  return (
    <Router>
      <GAListener />
    <div className="app-container">
      <Header />

      <main className="main-layout">
      <div class="panel-container">
        <LeftPanel
          onFileSelect={handleFileSelect}
          onPdfPreview={handlePdfPreview}
          pdfUrl={pdfUrl}
          highlightedReferences={highlightedReferences} 
          activeTab={activeTab} 
          jumpTarget={jumpTarget}
        />
        <RightPanel
          file={selectedFile}
          sectionData={sectionData}
          criteriaData={criteriaData}
          onSetHighlightedReferences={handleSetHighlightedReferences} 
          onSetActiveTab={handleSetActiveTab} 
          onSetData={handleSetData} 
          onJumpToReference={handleJumpToReference}
        />
        </div>
      </main>
      <Footer />
    </div>
    </Router>
  );
}

const GAListener = () => {
  const location = useLocation();

  useEffect(() => {
    trackPageView(location.pathname);
  }, [location]);

  return null;
};


export default App;
