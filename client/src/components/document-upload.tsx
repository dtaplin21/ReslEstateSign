import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";

interface DocumentUploadProps {
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
}

export function DocumentUpload({ onFileSelect, selectedFile }: DocumentUploadProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles[0]);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    maxSize: 25 * 1024 * 1024, // 25MB
  });

  const removeFile = () => {
    onFileSelect(null);
  };

  return (
    <div className="space-y-4">
      {!selectedFile ? (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive && !isDragReject
              ? "border-primary bg-primary/5"
              : isDragReject
              ? "border-destructive bg-destructive/5"
              : "border-border hover:border-primary hover:bg-primary/5"
          }`}
          data-testid="upload-zone"
        >
          <input {...getInputProps()} data-testid="file-input" />
          <div className="space-y-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <i className={`text-2xl ${
                isDragActive && !isDragReject 
                  ? "fas fa-file-import text-primary"
                  : isDragReject
                  ? "fas fa-times text-destructive"
                  : "fas fa-cloud-upload-alt text-primary"
              }`}></i>
            </div>
            <div>
              {isDragActive && !isDragReject ? (
                <p className="text-lg font-medium text-primary">Drop your PDF here</p>
              ) : isDragReject ? (
                <p className="text-lg font-medium text-destructive">Only PDF files are supported</p>
              ) : (
                <>
                  <p className="text-lg font-medium text-foreground">Drop your PDF here or click to browse</p>
                  <p className="text-muted-foreground">Supports PDF files up to 25MB</p>
                </>
              )}
            </div>
            {!isDragActive && (
              <Button type="button" data-testid="button-choose-file">
                Choose File
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-file-pdf text-red-600"></i>
              </div>
              <div>
                <p className="font-medium text-foreground" data-testid="selected-file-name">
                  {selectedFile.name}
                </p>
                <p className="text-sm text-muted-foreground" data-testid="selected-file-size">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={removeFile}
              data-testid="button-remove-file"
            >
              <i className="fas fa-times text-muted-foreground"></i>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
