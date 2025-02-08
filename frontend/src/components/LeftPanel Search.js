import React, { useState, useEffect } from "react";
import { Worker, Viewer } from "@react-pdf-viewer/core";
import "@react-pdf-viewer/core/lib/styles/index.css";
import { zoomPlugin } from "@react-pdf-viewer/zoom";
import "@react-pdf-viewer/zoom/lib/styles/index.css";
import { searchPlugin } from "@react-pdf-viewer/search";  
import "@react-pdf-viewer/search/lib/styles/index.css";
import axios from "axios";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;

function LeftPanel({ onFileSelect, onPdfPreview, pdfUrl, highlightedReferences, activeTab }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [matchedSentences, setMatchedSentences] = useState([]);  

  const zoomPluginInstance = zoomPlugin();
  const { ZoomIn, ZoomOut, ZoomPopover } = zoomPluginInstance;

  const searchPluginInstance = searchPlugin();
  const { highlight } = searchPluginInstance;

  const sanitizeText = (text) =>
    text
      .replace(/\[\d+(,\s*\d+)*\]/g, "") 
      .replace(/[-–—\s]+/g, "") 
      .replace(/[.,?!;:"'()_\-{}<>~`@#$%^&*|/]/g, "") 
      .toLowerCase(); 

  const findMatchingSentences = async () => {
    if (!pdfUrl || !highlightedReferences) {
      console.warn("PDF URL or highlightedReferences is missing.");
      return;
    }

    const pdfDoc = await pdfjsLib.getDocument(pdfUrl).promise;
    console.log("PDF document loaded:", pdfDoc);

    const foundSentences = []; 
    const searchQueries = [];  

    for (let i = 0; i < pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i + 1);
      const textContent = await page.getTextContent();

      const originalSentences = textContent.items.map((item) => item.str); 
      const cleanedText = sanitizeText(originalSentences.join(" "));

      console.log(`Processing page ${i + 1}:`, cleanedText);

      highlightedReferences.forEach((ref) => {
        const sanitizedRef = sanitizeText(ref.reference);
        const matchIndex = cleanedText.indexOf(sanitizedRef);

        if (matchIndex !== -1) { //percentage match
          console.log(`Found reference on page ${i + 1}:`, ref.reference);

          const matchedSentence = originalSentences.find((sentence) =>
            sanitizeText(sentence).includes(sanitizedRef)
          );

          if (matchedSentence) {
            console.log(`Original sentence found:`, matchedSentence);
            foundSentences.push(matchedSentence);
            searchQueries.push(ref.reference);  
          }
        }
      });
    }

    // pdf anotate/ pdf.js

    setMatchedSentences(foundSentences);  
    console.log("Matched Sentences:", foundSentences);

    if (searchQueries.length > 0) {
      console.log("Highlighting with searchPlugin:", searchQueries);
      await highlight(searchQueries);
    } else {
      console.warn("No matches found, skipping highlighting.");
    }
  };

  useEffect(() => {
    if (activeTab === "section" && pdfUrl && highlightedReferences?.length > 0) {
      findMatchingSentences();
    }
  }, [activeTab, pdfUrl, highlightedReferences]);

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
                      searchPluginInstance,
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
