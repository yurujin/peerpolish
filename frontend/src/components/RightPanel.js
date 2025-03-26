import React, { useState } from "react";
import { generateAIResponse } from "../services/api";
import { Oval } from 'react-loader-spinner';

import { trackEvent } from "../ga";

function RightPanel({ file, onSetHighlightedReferences, onSetActiveTab, onSetData, onJumpToReference }) {
  const [responses, setResponses] = useState(null);
  const [activeTab, setActiveTab] = useState("overall");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerateResponse = async () => {
    console.log("File passed to RightPanel:", file);
    if (!file) {
      setError("No file selected for generating response.");

      trackEvent("Generate Response", "Error", "No File Selected");

      return;
    }

    setLoading(true);
    setError(null);
    setResponses(null);

    trackEvent("Generate Response", "Click", "Start", { file_name: file.name });

    try {
      const aiResponses = await generateAIResponse(file);
      console.log("AI Responses received:", aiResponses);

      let parsedSectionReview = null;

      if (!aiResponses.sectionReview) {
        console.error("❌ sectionReview is missing:", aiResponses.sectionReview);
        setError("Missing section review in AI response.");

        trackEvent("Generate Response", "Error", "Missing sectionReview", { file_name: file.name });

        return;
      }

      console.log("Raw sectionReview:", aiResponses.sectionReview);

      let jsonString = aiResponses.sectionReview.trim();
      const match = jsonString.match(/```json\n([\s\S]*?)```/);
      if (match && match[1]) {
        jsonString = match[1];
      }

      try {
        parsedSectionReview = JSON.parse(jsonString);
        console.log("✅ Parsed Section Review:", parsedSectionReview);
      } catch (err) {
        console.error("❌ Failed to parse JSON:", err);
        setError("Invalid JSON format in AI response.");

        trackEvent("Generate Response", "Error", "Invalid JSON Format", { file_name: file.name });
        return;
      }

      const sectionData = parsedSectionReview?.section_review || [];
      if (!Array.isArray(sectionData)) {
        console.error("❌ section_review is not an array:", sectionData);
        setError("Invalid section review format.");

        trackEvent("Generate Response", "Error", "Invalid Section Review Format", { file_name: file.name });
        return;
      }

      const criteriaReferences = [];
      if (aiResponses.criteria) {
        Object.keys(aiResponses.criteria).forEach((categoryName) => {
          try {
            const parsedCategory = JSON.parse(aiResponses.criteria[categoryName]);
            parsedCategory.criteria.forEach((criterion) => {
              criterion.recommendations.forEach((rec) => {
                criteriaReferences.push({
                  reference: rec.reference,
                  id: `${categoryName}-${criterion.aspect}-${rec.recommendation.slice(0, 10)}`,
                });
              });
            });
          } catch (err) {
            console.error(`Failed to parse ${categoryName}:`, err);
          }
        });
      }

      setResponses({
        ...aiResponses,
        sectionReview: sectionData,
        criteria: aiResponses.criteria,
      });

      onSetHighlightedReferences([
        ...sectionData.map((item, index) => ({
          reference: item.reference,
          id: `section-${index}`,
          position: item.position,
        })),
        ...criteriaReferences,
      ]);

      trackEvent("Generate Response", "Success", "Generated", {
        file_name: file.name,
        section_count: sectionData.length,
      });

    } catch (err) {
      console.error("❌ Error generating AI response:", err);
      setError("Failed to generate AI response.");

      trackEvent("Generate Response", "Error", "Unknown Error", { file_name: file.name });

    } finally {
      setLoading(false);
    }
  };




  const handleTabChange = (tab) => {
    setActiveTab(tab);

    trackEvent("Switch Review Tab", "Click", tab);

    onSetActiveTab(tab);

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
    } else if (tab === "overall") {
      onSetHighlightedReferences([]);
    }
  };

  const renderSection = (sections, overallSummary) => {
    if (!sections || !Array.isArray(sections)) {
      return <p>No section review available.</p>;
    }

    return sections.map((item, index) => (
      <div key={index} className="section-aspect">
        <h3>
          {item.section}
        </h3>

        <div className="critique">
          <div>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
            Critique
          </div>
          <p>{item.critique}</p>
        </div>

        <div className="recommendation">
          <div>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
            </svg>
            Recommendation
          </div>
          <p>{item.recommendation}</p>
        </div>

        <div className="reference">
          <div>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Reference
          </div>
          <div className="reference-box" onClick={() => onJumpToReference(item.reference)}>
            <span >
              {item.reference}
            </span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>

    ))
  }


  const [activeCategory, setActiveCategory] = useState("Novelty");

  const renderCriteria = (criteriaData) => {
    const scrollToCategory = (category) => {
      setActiveCategory(category);
      const element = document.getElementById(`category-${category}`);
      const container = document.querySelector('.content-container');
    
      if (element && container) {
        const offsetTop = element.offsetTop;
    
        container.scrollTo({
          top: offsetTop,
          behavior: 'smooth'
        });
    
      }
    };
    if (!criteriaData || typeof criteriaData !== "object") {
      return <p>No criteria review available.</p>;
    }

    return (
      <div className="criteria-container">
        <div className="nav-container">
          {Object.keys(criteriaData).map((category) => (
            <div
              key={category}
              className={`tab-item ${activeCategory === category ? 'active' : ''}`}
              onClick={() => scrollToCategory(category)}
            >
              <span>{category}</span>
              <span className="tab-indicator">▶</span>
            </div>
          ))}
        </div>

        <div className="content-container">
          {Object.keys(criteriaData).map((category) => {
            const categoryJsonString = criteriaData[category];
            try {
              const parsedCategory = JSON.parse(categoryJsonString);
              return (
                <div
                  key={category}
                  id={`category-${category}`}
                  className="content-section"
                  style={{ paddingTop: '80px', marginTop: '-60px' }} 
                  
                >
                  <div className="criteria-aspect">
                    <h2>{category}</h2>

                    <div className="criteria-details">
                      {parsedCategory.criteria.map((criterion, idx) => (
                        <div key={idx} className="criteria-card">
                          <h4>{criterion.aspect}</h4>
                          <ul>
                            {criterion.recommendations?.map((rec, recIdx) => (
                              <li key={recIdx}>
                                <div className="recommendation-title">
                                  Recommendation:
                                </div>
                                <div>{rec.recommendation}</div>
                                <div className="reference-container">
                                  <span className="reference-title">Reference:</span>

                                  <div className="reference-box2"
                                    onClick={() => onJumpToReference(rec.reference)}>
                                    <svg
                                      width="16"
                                      height="16"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      style={{ flexShrink: 0 }}
                                    >
                                      <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />                      </svg>
                                    <span>
                                      {rec.reference}
                                    </span>
                                    <svg
                                      width="14"
                                      height="14"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                    >
                                      <path d="M5 12h14M12 5l7 7-7 7" />
                                    </svg>
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>

                    <div className="overall-comment">
                      <h3 >Overall Comment</h3>
                      <p >{parsedCategory.overallComment?.summary || "No summary available."}</p>
                      <ul>
                        {parsedCategory.overallComment?.recommendations?.map((rec, idx) => (
                          <li key={idx} >{rec}</li>
                        ))}
                      </ul>
                      </div>
                </div>
              </div>
            );
          } catch (err) {
            return <div key={category} className="parse-error">error</div>;
          }
        })}
      </div>
    </div>
  );
};

const renderOverall = (content) => {
  if (!content) return (
        <p className="no-overall-review">
          No overall review available
        </p>
        );

        const parsedContent = content
        .split('\n\n')
    .map((paragraph, index) => {
      const elements = paragraph.split(/(\*\*.+?\*\*)/g).map((text, i) => {
        if (text.startsWith('**') && text.endsWith('**')) {
          const cleanText = text.slice(2, -2);
        return (
        <span key={i} className="highlighted-text">
          {cleanText}
        </span>
        );
        }
        return text;
      });

        return (
        <p key={index} className="overall-text">
          {elements}
        </p>
        );
    });

        return (
        <div className="overall-review">
          <h2>
            Overall Review
          </h2>
          {parsedContent}
        </div>
        );
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
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13 3v7h7v2h-7v7h-2v-7H4v-2h7V3h2zm-1 18c-4.97 0-9-4.03-9-9s4.03-9 9-9 9 4.03 9 9-4.03 9-9 9z" />
              </svg>
              Generate Response
            </button>
          </div>
          <div className="review-content">
            {/* {loading && <p>Loading AI responses...</p>} */}
            {loading && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginTop: '20px'
              }}>
                <Oval
                  height={30}
                  width={30}
                  color="#2196f3"
                  visible={true}
                  ariaLabel='oval-loading'
                />
                <span>Loading AI responses, may take a few minutes...</span>
              </div>
            )}
            {error && <p style={{ color: "red" }}>{error}</p>}
            {!loading && !error && renderContent()}
          </div>
        </section>
        );
}

        export default RightPanel;
