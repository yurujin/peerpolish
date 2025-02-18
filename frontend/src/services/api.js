import axios from "axios";

const API_URL = process.env.REACT_APP_BACKEND_URL || "http://127.0.0.1:8000";
console.log("Backend API URL:", process.env.REACT_APP_BACKEND_URL);


export const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
        const response = await axios.post(`${API_URL}/upload/`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
            responseType: "blob", 
        });

        const pdfBlob = new Blob([response.data], { type: "application/pdf" });

        const pdfUrl = URL.createObjectURL(pdfBlob);
        console.log("Generated PDF URL:", pdfUrl); 
        return pdfUrl;

    } catch (error) {
        console.error("Error uploading file:", error.response?.data || error.message);
        throw new Error("Failed to upload and convert file.");
    }
};

export const generateAIResponse = async (file) => {
    console.log("Preparing to send API request with file:", file); 
    const formData = new FormData();
    formData.append("file", file);

    try {
        const response = await axios.post(`${API_URL}/generate-response/`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });

        console.log("API Response received:", response.data); 
        return {
            criteria: response.data.criteria,
            sectionReview: response.data.section_review,
            overallReview: response.data.overall_review,
        };
    } catch (error) {
        console.error("Error during API request:", error.response?.data || error.message);
        throw new Error(error.response?.data?.error || "Failed to generate AI response.");
    }
};
