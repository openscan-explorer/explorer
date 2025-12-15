import type React from "react";
import { useCallback, useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../../../context/AppContext";
import { useZipJsonReader } from "../../../hooks/useZipJsonReader";

const DevelopmentSection: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const { jsonFiles, setJsonFiles } = useContext(AppContext);
  const { processZip, loading, error } = useZipJsonReader();
  const navigate = useNavigate();

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const droppedFiles = Array.from(e.dataTransfer.files);
      setFiles((prevFiles) => [...prevFiles, ...droppedFiles]);

      // Process zip files and merge JSON data
      for (const file of droppedFiles) {
        if (file.name.endsWith(".zip")) {
          const jsonData = await processZip(file);
          // Merge new JSON files with existing ones
          // biome-ignore lint/suspicious/noExplicitAny: <TODO>
          setJsonFiles((prev: Record<string, any>) => ({
            ...prev,
            ...jsonData,
          }));
        }
      }
    },
    [processZip, setJsonFiles],
  );

  const handleFileInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const selectedFiles = Array.from(e.target.files);
        setFiles((prevFiles) => [...prevFiles, ...selectedFiles]);

        // Process zip files and merge JSON data
        for (const file of selectedFiles) {
          if (file.name.endsWith(".zip")) {
            const jsonData = await processZip(file);
            // Merge new JSON files with existing ones
            setJsonFiles(jsonData);
          }
        }
      }
    },
    [processZip, setJsonFiles],
  );

  const handleRemoveFile = useCallback((index: number) => {
    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  }, []);

  const handleClearAll = useCallback(() => {
    setFiles([]);
  }, []);

  const handleClearArtifacts = useCallback(() => {
    setJsonFiles({});
  }, [setJsonFiles]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Math.round((bytes / k ** i) * 100) / 100} ${sizes[i]}`;
  };

  return (
    <div className="devtools-section">
      <div className="info-box dev-section-container">
        <h3 className="dev-section-title">Hardhat Ignition</h3>
        <p className="dev-section-description">
          Provide a .zip file with the project's <b>contracts/</b> and <b>ignition/</b> directories
          inside. This will be used as local verification method
        </p>

        {/* biome-ignore lint/a11y/noStaticElementInteractions: drag and drop zone */}
        <div
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`dev-dropzone ${isDragging ? "dragging" : ""}`}
        >
          <div className="dev-dropzone-icon">📁</div>
          <h4 className="dev-dropzone-title">
            {isDragging ? "Drop files here" : "Drag and drop ZIP files here"}
          </h4>
          <p className="dev-dropzone-separator">or</p>
          <label htmlFor="file-input" className="dev-browse-btn">
            Browse Files
          </label>
          <input
            id="file-input"
            type="file"
            multiple
            onChange={handleFileInput}
            className="hidden"
          />
        </div>

        {files.length > 0 && (
          <div>
            <div className="flex-between mb-medium">
              <h4 className="dev-section-subtitle">Uploaded Files ({files.length})</h4>
              <button type="button" onClick={handleClearAll} className="dev-clear-btn">
                Clear All
              </button>
            </div>

            <div className="dev-file-list">
              {files.map((file, index) => (
                <div key={`${file.name}-${index}`} className="dev-file-item">
                  <div className="dev-file-item-content">
                    <div className="dev-file-name">{file.name}</div>
                    <div className="dev-file-meta">
                      <span>Size: {formatFileSize(file.size)}</span>
                      <span>Type: {file.type || "Unknown"}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(index)}
                    className="dev-remove-btn"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {files.length === 0 && !loading && Object.keys(jsonFiles).length === 0 && (
          <div className="dev-empty-state">
            No files uploaded yet. Drag and drop or browse to add files.
          </div>
        )}

        {loading && (
          <div className="dev-loading-state">
            <div className="dev-loading-icon">⏳</div>
            <div className="dev-loading-text">Processing ZIP file...</div>
          </div>
        )}

        {error && (
          <div className="dev-error-state">
            <div className="dev-error-icon">⚠️</div>
            <div className="dev-error-text">{error}</div>
          </div>
        )}

        {Object.keys(jsonFiles).length > 0 && (
          <div className="mt-large">
            <div className="flex-between mb-medium">
              <h4 className="dev-section-subtitle">
                Extracted JSON Files ({Object.keys(jsonFiles).length})
              </h4>
              <button type="button" onClick={handleClearArtifacts} className="dev-clear-btn">
                Clear Artifacts
              </button>
            </div>
            <div className="dev-json-list">
              {Object.entries(jsonFiles).map(([path, data]) => (
                <div key={path} className="dev-json-item">
                  {/* biome-ignore lint/a11y/noStaticElementInteractions: clickable path */}
                  {/* biome-ignore lint/a11y/useKeyWithClickEvents: clickable path */}
                  <div onClick={() => navigate(`/31337/address/${path}`)} className="dev-json-path">
                    {path}
                  </div>
                  <details>
                    <summary className="dev-json-summary">View JSON content</summary>
                    <pre className="dev-json-content">{JSON.stringify(data, null, 2)}</pre>
                  </details>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DevelopmentSection;
