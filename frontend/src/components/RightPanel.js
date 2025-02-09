import React, { useState } from "react";
import { generateAIResponse } from "../services/api";

function RightPanel({ file, onSetHighlightedReferences, onSetActiveTab, onSetData }) {
  const [responses, setResponses] = useState(null);
  const [activeTab, setActiveTab] = useState("overall");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerateResponse = async () => {
    console.log("File passed to RightPanel:", file);
    if (!file) {
        setError("No file selected for generating response.");
        return;
    }

    setLoading(true);
    setError(null);
    setResponses(null);

    try {
        const aiResponses = await generateAIResponse(file);
        console.log("AI Responses received:", aiResponses);

        let parsedSectionReview = null;

        // **检查 sectionReview 是否存在**
        if (!aiResponses.sectionReview) {
            console.error("❌ sectionReview is missing:", aiResponses.sectionReview);
            setError("Missing section review in AI response.");
            return;
        }

        console.log("Raw sectionReview:", aiResponses.sectionReview);

        // **去掉 Markdown 代码块**
        let jsonString = aiResponses.sectionReview.trim();
        const match = jsonString.match(/```json\n([\s\S]*?)```/);
        if (match && match[1]) {
            jsonString = match[1]; // 提取 JSON 代码
        }

        // **解析 JSON**
        try {
            parsedSectionReview = JSON.parse(jsonString);
            console.log("✅ Parsed Section Review:", parsedSectionReview);
        } catch (err) {
            console.error("❌ Failed to parse JSON:", err);
            setError("Invalid JSON format in AI response.");
            return;
        }

        // **检查 section_review 是否是数组**
        const sectionData = parsedSectionReview?.section_review || [];
        if (!Array.isArray(sectionData)) {
            console.error("❌ section_review is not an array:", sectionData);
            setError("Invalid section review format.");
            return;
        }

        // **更新 state**
        setResponses({
            ...aiResponses,
            sectionReview: sectionData,
        });

        // **提取引用和位置信息**
        const references = sectionData.map((item, index) => ({
            reference: item.reference,
            id: index,
            position: item.position,
        }));
        onSetHighlightedReferences(references);

        onSetData(sectionData, aiResponses.criteria); // 保存 Section 和 Criteria 数据
    } catch (err) {
        console.error("❌ Error generating AI response:", err);
        setError("Failed to generate AI response.");
    } finally {
        setLoading(false);
    }
};

  

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    onSetActiveTab(tab);
  
    if (tab === "section" && responses?.sectionReview) {
      const references = responses.sectionReview.map((item, index) => ({
        reference: item.reference,
        id: index,
        position: item.position, // 添加 position 数据
      }));
      onSetHighlightedReferences(references); // 更新引用
    }
  };
  

  const renderSection = (sections) => {
    if (!sections || !Array.isArray(sections)) {
      return <p>No section review available.</p>;
    }

    return sections.map((item, index) => (
      <div key={index}>
        <h3>{item.section}</h3>
        <p>
          <strong>Critique:</strong> {item.critique}
        </p>
        <p>
          <strong>Recommendation:</strong>{" "}
          <span
            onClick={() => console.log(`Jump to reference ID: ${index}`)}
            style={{ cursor: "pointer", textDecoration: "underline", color: "blue" }}
          >
            {item.recommendation}
          </span>
        </p>
      </div>
    ));
  };

  const renderCriteria = (criteria) => {
    if (!criteria || typeof criteria !== "object") {
      return <p>No criteria review available.</p>;
    }

    return Object.keys(criteria).map((aspect) => (
      <div key={aspect} className="criteria-aspect">
        <h3>{aspect}</h3>
        <div>
          {criteria[aspect]
            .split("\n")
            .map((line, index) => (
              <p key={index}>{line}</p>
            ))}
        </div>
      </div>
    ));
  };

  const renderOverall = (content) => {
    if (!content) return <p>No overall review available.</p>;
    const parsedContent = content
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n/g, "<br>");
    return <div dangerouslySetInnerHTML={{ __html: parsedContent }} />;
  };

  const renderContent = () => {
    if (!responses) {
      return <p>AI responses will appear here once generated...</p>;
    }

    switch (activeTab) {
      case "overall":
        return renderOverall(responses.overallReview);
      case "section":
        return renderSection(responses.sectionReview);
      case "criteria":
        return renderCriteria(responses.criteria);
      default:
        return null;
    }
  };

  return (
    <section className="right-panel">
      <div className="review-tabs">
        <button
          className={`tab-btn ${activeTab === "overall" ? "active" : ""}`}
          onClick={() => handleTabChange("overall")}
        >
          Overall Review
        </button>
        <button
          className={`tab-btn ${activeTab === "section" ? "active" : ""}`}
          onClick={() => handleTabChange("section")}
        >
          By Section
        </button>
        <button
          className={`tab-btn ${activeTab === "criteria" ? "active" : ""}`}
          onClick={() => handleTabChange("criteria")}
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
        {!loading && !error && renderContent()}
      </div>
    </section>
  );
}

export default RightPanel;
