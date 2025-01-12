

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

