import React, { useState } from "react";
import { uploadFile } from "../services/api";
import { trackEvent } from "../ga"; 

const FileUploader = () => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [fileContent, setFileContent] = useState("");
    const [response, setResponse] = useState("");

    const handleFileChange = (e) => {
        setSelectedFile(e.target.files[0]);
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            alert("Please select a file first!");
            return;
        }

        trackEvent("File Upload", "Upload", selectedFile.name, {
            file_size: selectedFile.size, 
            file_type: selectedFile.type
        });

        const result = await uploadFile(selectedFile);
        setFileContent(result.file_content);
        setResponse(result.response);
    };

    return (
        <div>
            <h1>Upload a File</h1>
            <input type="file" onChange={handleFileChange} />
            <button onClick={handleUpload}>Upload</button>
            <div>
                <h2>File Content</h2>
                <pre>{fileContent}</pre>
                <h2>AI Response</h2>
                <pre>{response}</pre>
            </div>
        </div>
    );
};

export default FileUploader;
