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

        // ====================== 解析 Criteria Data ======================
    const criteriaReferences = [];
    if (aiResponses.criteria) {
      Object.keys(aiResponses.criteria).forEach((categoryName) => {
        try {
          const parsedCategory = JSON.parse(aiResponses.criteria[categoryName]);
          parsedCategory.criteria.forEach((criterion) => {
            criterion.recommendations.forEach((rec) => {
              criteriaReferences.push({
                reference: rec.reference,
                id: `${categoryName}-${criterion.aspect}-${rec.recommendation.slice(0, 10)}`, // 生成唯一 ID
              });
            });
          });
        } catch (err) {
          console.error(`Failed to parse ${categoryName}:`, err);
        }
      });
    }

    // ====================== 更新状态 ======================
    setResponses({
      ...aiResponses,
      sectionReview: sectionData,
      criteria: aiResponses.criteria,
    });

    // 传递所有引用（Section + Criteria）
    onSetHighlightedReferences([
      ...sectionData.map((item, index) => ({
        reference: item.reference,
        id: `section-${index}`,
        position: item.position,
      })),
      ...criteriaReferences,
    ]);

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

  // 根据 Tab 类型过滤引用
  if (tab === "section" && responses?.sectionReview) {
    const sectionRefs = responses.sectionReview.map((item, index) => ({
      reference: item.reference,
      id: `section-${index}`,
      position: item.position,
    }));
    onSetHighlightedReferences(sectionRefs);
  } else if (tab === "criteria" && responses?.criteria) {
    const criteriaRefs = [];
    Object.keys(responses.criteria).forEach((categoryName) => {
      try {
        const parsedCategory = JSON.parse(responses.criteria[categoryName]);
        parsedCategory.criteria.forEach((criterion) => {
          criterion.recommendations.forEach((rec) => {
            criteriaRefs.push({
              reference: rec.reference,
              id: `${categoryName}-${criterion.aspect}-${rec.recommendation.slice(0, 10)}`,
            });
          });
        });
      } catch (err) {
        console.error(`Failed to parse ${categoryName}:`, err);
      }
    });
    onSetHighlightedReferences(criteriaRefs);
  }else if (tab === "overall") {
    onSetHighlightedReferences([]); 
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

  const renderCriteria = (criteriaData) => {
    if (!criteriaData || typeof criteriaData !== "object") {
      return <p>No criteria review available.</p>;
    }
  
    return Object.keys(criteriaData).map((categoryName) => {
      const categoryJsonString = criteriaData[categoryName];
      let parsedCategory;
  
      try {
        parsedCategory = JSON.parse(categoryJsonString);
      } catch (err) {
        console.error(`Failed to parse ${categoryName}:`, err);
        return (
          <div key={categoryName} style={{ marginBottom: "40px" }}>
            <h2 style={{ color: "blue" }}>{categoryName}</h2>
            <p>Invalid data format for this category.</p>
          </div>
        );
      }
  
      const { criteria = [], overallComment } = parsedCategory;
  
      return (
        <div key={categoryName} style={{ marginBottom: "40px" }}>
          {/* 大类标题（蓝色） */}
          <h2 style={{ color: "#2c3e72", borderBottom: "2px solid #ccc", paddingBottom: "8px" }}>
            {categoryName}
          </h2>
  
          {/* 具体评审标准（不显示 "Criteria Details" 标题） */}
          <div style={{ marginTop: "20px" }}>
            {criteria.map((criterion, idx) => (
              <div key={idx} style={{ marginBottom: "25px", padding: "15px", backgroundColor: "#f8f9fa" }}>
                {/* 具体标准标题 */}
                <h4 style={{ color: "#2c3e50", marginBottom: "10px" }}>{criterion.aspect}</h4>
                <ul style={{ listStyle: "none", paddingLeft: "0" }}>
                  {criterion.recommendations?.map((rec, recIdx) => (
                    <li key={recIdx} style={{ marginBottom: "15px" }}>
                      <div style={{ fontWeight: "600", color: "#2980b9" }}>
                        Recommendation:
                      </div>
                      <div style={{ marginBottom: "8px" }}>{rec.recommendation}</div>
                      <div style={{ fontWeight: "600", color: "#27ae60" }}>
                        Reference:
                      </div>
                      <div>{rec.reference}</div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
  
          {/* 总体评论 */}
          <div style={{ marginTop: "30px" }}>
            <h3 style={{ color: "#333", marginBottom: "15px" }}>Overall Comment</h3>
            <p style={{ lineHeight: "1.6", color: "#555" }}>
              {overallComment?.summary || "No summary available."}
            </p>
            <ul style={{ paddingLeft: "20px", color: "#555" }}>
              {overallComment?.recommendations?.map((rec, idx) => (
                <li key={idx} style={{ marginBottom: "8px" }}>{rec}</li>
              ))}
            </ul>
          </div>
        </div>
      );
    });
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
