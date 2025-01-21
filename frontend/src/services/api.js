import axios from "axios";

const API_URL = "http://127.0.0.1:8000";

// 上传文件并返回 PDF 下载链接
export const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
        // 设置 responseType 为 'blob'
        const response = await axios.post(`${API_URL}/upload/`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
            responseType: "blob", // 重要，返回二进制流
        });

        // 将二进制流转换为 Blob 对象
        const pdfBlob = new Blob([response.data], { type: "application/pdf" });

        // 生成可下载的 URL
        const pdfUrl = URL.createObjectURL(pdfBlob);
        console.log("Generated PDF URL:", pdfUrl); // 检查生成的 URL
        return pdfUrl;

    } catch (error) {
        console.error("Error uploading file:", error.response?.data || error.message);
        throw new Error("Failed to upload and convert file.");
    }
};

// 生成 AI 响应并返回处理结果
export const generateAIResponse = async (file) => {
    console.log("Preparing to send API request with file:", file); // 确保文件信息正确
    const formData = new FormData();
    formData.append("file", file);

    try {
        const response = await axios.post(`${API_URL}/generate-response/`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });

        console.log("API Response received:", response.data); // 确保响应数据正确
        // 根据后端返回的数据结构，提取需要的部分
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
