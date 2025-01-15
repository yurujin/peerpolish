

import axios from "axios";

const API_URL = "http://127.0.0.1:8000";

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
        return pdfUrl;

    } catch (error) {
        console.error("Error uploading file:", error);
        throw new Error("Failed to upload and convert file.");
    }
};


export const generateAIResponse = async (file) => {
    console.log("Preparing to send API request with file:", file); // 检查 file 是否正确
    const formData = new FormData();
    formData.append("file", file);

    try {
        const response = await axios.post(`${API_URL}/generate-response/`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });

        console.log("API Response received:", response.data); // 检查响应数据
        return response.data.responses;
    } catch (error) {
        console.error("Error during API request:", error); // 打印错误日志
        throw new Error("Failed to generate AI response.");
    }
};
