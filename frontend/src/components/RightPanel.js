import React, { useState } from "react";
import { generateAIResponse } from "../services/api";

function RightPanel({ file }) {
  const [responses, setResponses] = useState(null);
  const [activeTab, setActiveTab] = useState("overall"); // 当前活动的 tab
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerateResponse = async () => {
    console.log("File passed to RightPanel:", file); // 确认 file 是否正确传递
    if (!file) {
      setError("No file selected for generating response.");
      return;
    }

    setLoading(true);
    setError(null);
    setResponses(null);

    try {
      const aiResponses = await generateAIResponse(file); // 调用 API
      console.log("AI Responses received:", aiResponses); // 检查响应内容
      setResponses(aiResponses);
    } catch (err) {
      console.error("Error generating AI response:", err);
      setError("Failed to generate AI response.");
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (!responses) {
      return "<p>AI responses will appear here once generated...</p>";
    }
  
    switch (activeTab) {
      case "overall":
        return responses.overall || "No overall review available.";
      case "section":
        return responses.section || "No section review available.";
      case "criteria":
        return responses.criteria || "No criteria review available.";
      default:
        return null;
    }
  };
  

  return (
    <section className="right-panel">
      <div className="review-tabs">
        <button
          className={`tab-btn ${activeTab === "overall" ? "active" : ""}`}
          onClick={() => setActiveTab("overall")}
        >
          Overall Review
        </button>
        <button
          className={`tab-btn ${activeTab === "section" ? "active" : ""}`}
          onClick={() => setActiveTab("section")}
        >
          By Section
        </button>
        <button
          className={`tab-btn ${activeTab === "criteria" ? "active" : ""}`}
          onClick={() => setActiveTab("criteria")}
        >
          By Criteria
        </button>
        <button className="generate-btn" onClick={handleGenerateResponse}>
          Generate Response
        </button>
      </div>
      <div className="review-content">
        {loading && <p>Loading AI responses...</p>}
        {error && <p style={{ color: "red" }}>{error}</p>}
        {!loading && !error && (
          <div dangerouslySetInnerHTML={{ __html: renderContent() }}></div>
        )}
      </div>
    </section>
  );
}

export default RightPanel;
