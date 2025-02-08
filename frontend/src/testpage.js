import React, { useState } from "react";
import { Worker, Viewer } from "@react-pdf-viewer/core";
import { highlightPlugin, RenderHighlightsProps } from "@react-pdf-viewer/highlight";
import { zoomPlugin } from "@react-pdf-viewer/zoom";
import * as pdfjsLib from "pdfjs-dist";

import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/highlight/lib/styles/index.css";
import "@react-pdf-viewer/zoom/lib/styles/index.css";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;

const TestPage = () => {
    const [pdfUrl, setPdfUrl] = useState(null);
    const [searchText, setSearchText] = useState("");
    const [highlights, setHighlights] = useState([]);

    // Initialize plugins
    const zoomPluginInstance = zoomPlugin();
    const { ZoomIn, ZoomOut, ZoomPopover } = zoomPluginInstance;

    // Handle PDF file upload
    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file && file.type === "application/pdf") {
            const pdfBlobUrl = URL.createObjectURL(file);
            setPdfUrl(pdfBlobUrl);
            setHighlights([]); // Clear existing highlights
        } else {
            alert("Please upload a valid PDF file!");
        }
    };

    // Calculate highlights based on the search text
    const calculateHighlights = async () => {
        if (!searchText.trim() || !pdfUrl) return;
    
        const pdfDoc = await pdfjsLib.getDocument(pdfUrl).promise;
        let foundHighlights = [];
    
        console.log("搜索文本:", searchText);
    
        for (let pageIndex = 0; pageIndex < pdfDoc.numPages; pageIndex++) {
            console.log(`正在处理第 ${pageIndex + 1} 页...`);
    
            const page = await pdfDoc.getPage(pageIndex + 1);
            const textContent = await page.getTextContent();
            const viewport = page.getViewport({ scale: 1 });
    
            // 拼接所有 item.str 成一个完整的文本，并记录每个 item 的原始索引和位置
            let fullText = "";
            const itemRanges = []; // 记录每个 item 的起始和结束位置
            textContent.items.forEach((item, itemIndex) => {
                itemRanges.push({
                    start: fullText.length,
                    end: fullText.length + item.str.length,
                    item, // 保存 item 引用
                    itemIndex, // 保存 item 的原始索引
                });
                fullText += item.str; // 直接拼接，不添加空格
                console.log(`item${itemIndex + 1}:`, item.str);
            });
    
            console.log("完整文本:", fullText);
            console.log("item 范围:", itemRanges);
    
            // 去掉 fullText 和 searchText 中的空格
            const cleanFullText = fullText.replace(/\s+/g, "");
            const cleanSearchText = searchText.replace(/\s+/g, "");
            console.log("去掉空格后的完整文本:", cleanFullText);
            console.log("去掉空格后的搜索文本:", cleanSearchText);
    
            // 在去掉空格后的完整文本中搜索去掉空格后的 searchText
            let matchStart = cleanFullText.indexOf(cleanSearchText);
            console.log("初始匹配位置（去掉空格后）:", matchStart);
    
            while (matchStart !== -1) {
                const matchEnd = matchStart + cleanSearchText.length;
                console.log(`找到匹配: 起始位置=${matchStart}, 结束位置=${matchEnd}`);
    
                // 将去掉空格后的匹配位置映射回原始 fullText 中的位置
                let originalStart = -1;
                let originalEnd = -1;
                let currentCleanIndex = 0;
    
                for (let i = 0; i < fullText.length; i++) {
                    if (/\S/.test(fullText[i])) { // 如果不是空格
                        if (currentCleanIndex === matchStart) {
                            originalStart = i;
                        }
                        if (currentCleanIndex === matchEnd - 1) {
                            originalEnd = i + 1;
                            break;
                        }
                        currentCleanIndex++;
                    }
                }
    
                console.log(`原始 fullText 中的匹配位置: 起始=${originalStart}, 结束=${originalEnd}`);
    
                if (originalStart === -1 || originalEnd === -1) {
                    console.log("无法映射到原始 fullText 中的位置，跳过此次匹配。");
                    matchStart = cleanFullText.indexOf(cleanSearchText, matchEnd);
                    continue;
                }
    
                // 找到匹配的 item 范围
                const matchingItems = itemRanges.filter(
                    (range) => range.end > originalStart && range.start < originalEnd
                );
                console.log("匹配的 item 范围:", matchingItems);
    
                // 计算每个匹配 item 中的高亮区域
                matchingItems.forEach((range) => {
                    const item = range.item;
                    const itemStart = Math.max(originalStart, range.start);
                    const itemEnd = Math.min(originalEnd, range.end);
    
                    console.log(`处理 item: ${item.str}`);
                    console.log(`item 起始位置: ${range.start}, item 结束位置: ${range.end}`);
                    console.log(`高亮起始位置: ${itemStart}, 高亮结束位置: ${itemEnd}`);
    
                    // 计算高亮区域在 item.str 中的起始和结束位置
                    const highlightStart = itemStart - range.start;
                    const highlightEnd = itemEnd - range.start;
    
                    console.log(`高亮区域在 item.str 中的起始: ${highlightStart}, 结束: ${highlightEnd}`);
    
                    // 计算高亮区域的宽度
                    const highlightWidth = (highlightEnd - highlightStart) / item.str.length * item.width;
    
                    // 计算高亮区域的起始 X 坐标
                    const x = item.transform[4] + (highlightStart / item.str.length) * item.width;
    
                    // 计算高亮区域的 Y 坐标
                    const y = viewport.height - item.transform[5] - item.height;
    
                    console.log(`高亮区域坐标: x=${x}, y=${y}`);
                    console.log(`高亮区域宽度: ${highlightWidth}, 高度: ${item.height}`);
    
                    // 生成高亮区域
                    const highlightArea = {
                        pageIndex,
                        left: (x / viewport.width) * 100,
                        top: (y / viewport.height) * 100,
                        width: (highlightWidth / viewport.width) * 100,
                        height: (item.height / viewport.height) * 100,
                    };
    
                    console.log("高亮区域:", highlightArea);
                    foundHighlights.push(highlightArea);
                });
    
                // 继续查找下一个匹配
                matchStart = cleanFullText.indexOf(cleanSearchText, matchEnd);
                console.log("下一个匹配位置（去掉空格后）:", matchStart);
            }
        }
    
        console.log("所有高亮区域:", foundHighlights);
        setHighlights(foundHighlights);
    };
    
    // Render the highlights
    const renderHighlights = (props) => (
        <div>
            {highlights
                .filter((area) => area.pageIndex === props.pageIndex)
                .map((area, idx) => (
                    <div
                        key={idx}
                        style={Object.assign(
                            {},
                            {
                                background: "yellow",
                                opacity: 0.4,
                            },
                            props.getCssProperties(area, props.rotation)
                        )}
                    />
                ))}
        </div>
    );

    // Initialize the highlight plugin
    const highlightPluginInstance = highlightPlugin({
        renderHighlights,
    });

    return (
        <div style={{ padding: "20px", maxWidth: "800px", margin: "auto" }}>
            <h2>PDF Search & Highlight</h2>

            {/* PDF Upload */}
            <div style={{ marginBottom: "10px" }}>
                <input type="file" accept="application/pdf" onChange={handleFileChange} />
            </div>

            {/* Search Bar */}
            <div style={{ marginBottom: "10px" }}>
                <input
                    type="text"
                    placeholder="Enter search text..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    style={{ padding: "5px", width: "60%", marginRight: "10px" }}
                />
                <button onClick={calculateHighlights}>Search & Highlight</button>
            </div>

            {/* PDF Viewer */}
            <div style={{ position: "relative", height: "600px", border: "1px solid #ddd", marginTop: "10px" }}>
                {pdfUrl ? (
                    <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
                        {/* Toolbar with zoom controls */}
                        <div
                            style={{
                                position: "absolute",
                                top: "10px",
                                right: "10px",
                                zIndex: 1,
                                display: "flex",
                                gap: "8px",
                                background: "#fff",
                                padding: "8px",
                                borderRadius: "4px",
                                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                            }}
                        >
                            <ZoomIn />
                            <ZoomOut />
                            <ZoomPopover />
                        </div>

                        {/* Viewer with plugins */}
                        <Viewer
                            fileUrl={pdfUrl}
                            plugins={[highlightPluginInstance, zoomPluginInstance]}
                        />
                    </Worker>
                ) : (
                    <p>Please upload a PDF file</p>
                )}
            </div>
        </div>
    );
};

export default TestPage;