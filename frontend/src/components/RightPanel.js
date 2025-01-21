import React, { useState } from "react";
import { generateAIResponse } from "../services/api";

function RightPanel({ file }) {
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
      setResponses(aiResponses);
    } catch (err) {
      console.error("Error generating AI response:", err);
      setError("Failed to generate AI response.");
    } finally {
      setLoading(false);
    }
  };

  // 解析 Overall Tab 的内容
  const renderOverall = (content) => {
    if (!content) return <p>No overall review available.</p>;

    // 替换加粗标题和段落换行
    const parsedContent = content
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n/g, "<br>");
    return <div dangerouslySetInnerHTML={{ __html: parsedContent }} />;
  };

  // 解析 Section Tab 的内容
  const renderSection = (content) => {
    if (!content) return <p>No overall review available.</p>;

    // 替换加粗标题和段落换行
    const parsedContent = content
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n/g, "<br>");
    return <div dangerouslySetInnerHTML={{ __html: parsedContent }} />;
  };

  const renderCriteria = (criteria) => {
    if (!criteria || typeof criteria !== "object") {
      return <p>No criteria review available.</p>;
    }
  
    // 遍历 criteria 的每个 key（如 Novelty, Significance, Soundness）
    return Object.keys(criteria).map((aspect) => (
      <div key={aspect} className="criteria-aspect">
        {/* 渲染每个 aspect 的标题 */}
        <h3>{aspect}</h3>
        {/* 解析 Markdown 内容为 HTML */}
        <div
          dangerouslySetInnerHTML={{
            __html: parseMarkdownToHTML(criteria[aspect]),
          }}
        />
      </div>
    ));
  };
  
  // Markdown 转 HTML 的解析函数
  const parseMarkdownToHTML = (markdownText) => {
    if (!markdownText) return "";
  
    // 转换 Markdown 标题、加粗等为 HTML
    return markdownText
      .replace(/## (.+)/g, "<h4>$1</h4>") // 二级标题
      .replace(/### (.+)/g, "<h5>$1</h5>") // 三级标题
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") // 加粗
      .replace(/- \*\*(.+?)\*\*: (.+)/g, "<li><strong>$1</strong>: $2</li>") // 列表项
      .replace(/\n/g, "<br>"); // 换行
  };
  

  const renderContent = () => {
    if (!responses) {
      return <p>AI responses will appear here once generated...</p>;
    }

    switch (activeTab) {
      case "overall":
        return <p>{renderOverall(responses.overallReview) || "No overall review available."}</p>;
      case "section":
        return <p>{renderSection(responses.sectionReview) || "No section review available."}</p>;
      case "criteria":
        return <p>{renderCriteria(responses.criteria) || "No section review available." }</p>;
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
        {!loading && !error && renderContent()}
      </div>
    </section>
  );
}

export default RightPanel;
