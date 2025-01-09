import React, { useState } from "react";

function RightPanel() {
  const [activeTab, setActiveTab] = useState("overall-review");

  const showReview = (tab) => {
    setActiveTab(tab);
  };

  return (
    <section className="right-panel">
      <div className="review-tabs">
        <button className={`tab-btn ${activeTab === "overall-review" ? "active" : ""}`} onClick={() => showReview("overall-review")}>
          Overall Review
        </button>
        <button className={`tab-btn ${activeTab === "section-review" ? "active" : ""}`} onClick={() => showReview("section-review")}>
          By Section
        </button>
        <button className={`tab-btn ${activeTab === "criteria-review" ? "active" : ""}`} onClick={() => showReview("criteria-review")}>
          By Criteria
        </button>
      </div>
      <div id="overall-review" className={`review-content ${activeTab === "overall-review" ? "active" : ""}`}>
        <h3>Overall Review</h3>
        <p>AI-generated overall comments will appear here...</p>
      </div>
      <div id="section-review" className={`review-content ${activeTab === "section-review" ? "active" : ""}`}>
        <h3>Section-Wise Review</h3>
        <p>AI-generated section-wise comments will appear here...</p>
      </div>
      <div id="criteria-review" className={`review-content ${activeTab === "criteria-review" ? "active" : ""}`}>
        <h3>Criteria-Based Review</h3>
        <p>AI-generated criteria-specific comments will appear here...</p>
      </div>
    </section>
  );
}

export default RightPanel;
