import React, { useState, useRef } from 'react';
import styled from 'styled-components';
import { fileService } from '../services/fileService';
import { useSession } from '../contexts/SessionContext';
import { useError } from '../contexts/ErrorContext';
import { FileUploadOptions } from '../types';
import LoadingIndicator from './LoadingIndicator';

interface FileUploadProps {
  onUploadSuccess?: (data: any) => void;
  supportedFormats?: string[];
  maxSize?: number; // in MB
}

const UploadContainer = styled.div`
  background-color: white;
  border-radius: var(--border-radius);
  box-shadow: var(--box-shadow);
  padding: 20px;
  margin-bottom: 20px;
`;

const DropZone = styled.div<{ isDragActive: boolean }>`
  border: 2px dashed ${props => props.isDragActive ? 'var(--primary-color)' : 'var(--border-color)'};
  border-radius: var(--border-radius);
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
  margin-bottom: 20px;
  transition: all 0.2s;
  background-color: ${props => props.isDragActive ? 'rgba(52, 152, 219, 0.1)' : 'transparent'};
`;

const UploadIcon = styled.div`
  font-size: 40px;
  margin-bottom: 10px;
  color: var(--primary-color);
`;

const InputFile = styled.input`
  display: none;
`;

const UploadButton = styled.button`
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: var(--border-radius);
  padding: 10px 20px;
  font-size: 16px;
  cursor: pointer;
  margin-top: 10px;
  
  &:hover {
    background-color: #2980b9;
  }
  
  &:disabled {
    background-color: #bdc3c7;
    cursor: not-allowed;
  }
`;

const InfoText = styled.p`
  color: var(--text-color);
  margin: 10px 0;
  font-size: 14px;
`;

const ErrorText = styled.p`
  color: var(--error-color);
  margin: 10px 0;
  font-size: 14px;
`;

const FileDetailsContainer = styled.div`
  margin-top: 20px;
  border-top: 1px solid var(--border-color);
  padding-top: 20px;
`;

const FileDetails = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 10px;
`;

const FileName = styled.span`
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 10px;
`;

const FileSize = styled.span`
  font-size: 12px;
  color: #666;
  margin-right: 10px;
`;

const RemoveButton = styled.button`
  background-color: transparent;
  color: var(--error-color);
  border: none;
  cursor: pointer;
  font-size: 16px;
  padding: 5px;
  
  &:hover {
    color: #c0392b;
  }
`;

const SelectContainer = styled.div`
  margin-top: 15px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
`;

const Select = styled.select`
  padding: 8px 12px;
  border-radius: var(--border-radius);
  border: 1px solid var(--border-color);
  background-color: white;
  min-width: 200px;
`;

const Label = styled.label`
  font-size: 14px;
  color: var(--text-color);
  margin-right: 10px;
`;

const FileUpload: React.FC<FileUploadProps> = ({
  onUploadSuccess,
  supportedFormats = ['.pdb', '.mol2', '.sdf', '.mol', '.cif', '.xyz'],
  maxSize = 10, // 10MB default
}) => {
  const { session } = useSession();
  const { addError } = useError();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [format, setFormat] = useState<string>('');
  
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      validateAndSetFile(files[0]);
    }
  };
  
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(true);
  };
  
  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(false);
  };
  
  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(false);
    
    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      validateAndSetFile(files[0]);
    }
  };
  
  const validateAndSetFile = (file: File) => {
    // Check file size
    const fileSizeInMB = file.size / (1024 * 1024);
    if (fileSizeInMB > maxSize) {
      setUploadError(`File size exceeds the maximum limit of ${maxSize}MB.`);
      return;
    }
    
    // Check file extension
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!supportedFormats.includes(fileExtension)) {
      setUploadError(`Unsupported file format. Supported formats: ${supportedFormats.join(', ')}`);
      return;
    }
    
    // Set format based on file extension
    setFormat(fileExtension.substring(1)); // Remove the dot
    setSelectedFile(file);
    setUploadError(null);
  };
  
  const handleRemoveFile = () => {
    setSelectedFile(null);
    setUploadError(null);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const handleFormatChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setFormat(event.target.value);
  };
  
  const handleUpload = async () => {
    if (!selectedFile || !session) return;
    
    setIsUploading(true);
    setUploadError(null);
    
    const options: FileUploadOptions = {
      sessionId: session.id,
      format: format || undefined,
    };
    
    try {
      const result = await fileService.uploadFile(selectedFile, options);
      
      if (result.success && result.data) {
        if (onUploadSuccess) {
          onUploadSuccess(result.data);
        }
        setSelectedFile(null);
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        setUploadError(result.error || 'Upload failed');
        addError(result.error || 'Upload failed');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'An unexpected error occurred during upload';
      setUploadError(errorMessage);
      addError(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };
  
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) {
      return `${bytes} B`;
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    } else {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
  };
  
  return (
    <UploadContainer>
      <DropZone
        isDragActive={isDragActive}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <UploadIcon>📂</UploadIcon>
        <p>Drag and drop a file here, or click to select a file</p>
        <InfoText>
          Supported formats: {supportedFormats.join(', ')}
          <br />
          Maximum file size: {maxSize}MB
        </InfoText>
        <InputFile
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept={supportedFormats.join(',')}
        />
      </DropZone>
      
      {uploadError && <ErrorText>{uploadError}</ErrorText>}
      
      {selectedFile && (
        <FileDetailsContainer>
          <FileDetails>
            <FileName>{selectedFile.name}</FileName>
            <FileSize>{formatFileSize(selectedFile.size)}</FileSize>
            <RemoveButton onClick={handleRemoveFile}>×</RemoveButton>
          </FileDetails>
          
          <SelectContainer>
            <Label>Format:</Label>
            <Select value={format} onChange={handleFormatChange}>
              <option value="">Auto-detect</option>
              <option value="pdb">PDB</option>
              <option value="mol2">MOL2</option>
              <option value="sdf">SDF</option>
              <option value="mol">MOL</option>
              <option value="cif">mmCIF</option>
              <option value="xyz">XYZ</option>
            </Select>
          </SelectContainer>
          
          {isUploading ? (
            <LoadingIndicator size="small" message="Uploading..." />
          ) : (
            <UploadButton onClick={handleUpload} disabled={isUploading}>
              Upload
            </UploadButton>
          )}
        </FileDetailsContainer>
      )}
    </UploadContainer>
  );
};

export default FileUpload;