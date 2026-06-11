"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileText,
  File,
  X,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { parseFile, type ParsedDocument } from "@/lib/agent/pdf-parser";
import { addDocumentKnowledge, addTextKnowledge } from "@/lib/agent/knowledge";
import { toast } from "sonner";

type FileUploadProps = {
  systemId: string;
  onUploadComplete?: (document: ParsedDocument) => void;
};

export function FileUpload({ systemId, onUploadComplete }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<
    { name: string; status: "processing" | "success" | "error"; document?: ParsedDocument }[]
  >([]);

  // Handle drag events
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // Process file
  const processFile = useCallback(
    async (file: File) => {
      const fileId = `${file.name}-${Date.now()}`;

      setUploadedFiles((prev) => [
        ...prev,
        { name: file.name, status: "processing" },
      ]);

      try {
        // Parse file
        const document = await parseFile(file);

        // Add to knowledge base
        addDocumentKnowledge(
          systemId,
          document.title,
          document.content,
          document.extractedRules,
          file.size,
        );

        // Update status
        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.name === file.name ? { ...f, status: "success", document } : f,
          ),
        );

        toast.success(`Processed ${file.name}: ${document.extractedRules.length} rules extracted`);
        onUploadComplete?.(document);
      } catch (error) {
        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.name === file.name ? { ...f, status: "error" } : f,
          ),
        );
        toast.error(`Failed to process ${file.name}`);
      }
    },
    [systemId, onUploadComplete],
  );

  // Handle drop
  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length === 0) return;

      setIsProcessing(true);

      for (const file of files) {
        await processFile(file);
      }

      setIsProcessing(false);
    },
    [processFile],
  );

  // Handle file input
  const handleFileInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;

      setIsProcessing(true);

      for (const file of files) {
        await processFile(file);
      }

      setIsProcessing(false);

      // Reset input
      e.target.value = "";
    },
    [processFile],
  );

  // Remove file from list
  const removeFile = useCallback((fileName: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.name !== fileName));
  }, []);

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <motion.div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        animate={{
          borderColor: isDragging ? "rgb(16, 185, 129)" : "rgb(63, 63, 70)",
          backgroundColor: isDragging
            ? "rgba(16, 185, 129, 0.1)"
            : "transparent",
        }}
        className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors"
      >
        {isProcessing ? (
          <Loader2 className="h-8 w-8 text-zinc-400 animate-spin" />
        ) : (
          <Upload className="h-8 w-8 text-zinc-400" />
        )}

        <p className="mt-2 text-sm text-zinc-300">
          {isProcessing
            ? "Processing files..."
            : "Drag & drop files here, or click to select"}
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Supports PDF, TXT, MD files
        </p>

        <input
          type="file"
          multiple
          accept=".pdf,.txt,.md,.markdown"
          onChange={handleFileInput}
          className="hidden"
          id="file-upload"
        />
        <label htmlFor="file-upload">
          <Button variant="outline" size="sm" className="mt-4" asChild>
            <span>Select Files</span>
          </Button>
        </label>
      </motion.div>

      {/* Uploaded Files List */}
      <AnimatePresence>
        {uploadedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            {uploadedFiles.map((file) => (
              <motion.div
                key={file.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/30 p-3"
              >
                <div className="flex items-center gap-3">
                  {file.name.endsWith(".pdf") ? (
                    <File className="h-4 w-4 text-zinc-400" />
                  ) : (
                    <FileText className="h-4 w-4 text-zinc-400" />
                  )}

                  <div>
                    <p className="text-sm font-medium text-zinc-100">
                      {file.name}
                    </p>
                    {file.document && (
                      <p className="text-xs text-zinc-500">
                        {file.document.extractedRules.length} rules extracted
                        {file.document.metadata.pageCount > 0 &&
                          ` • ${file.document.metadata.pageCount} pages`}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {file.status === "processing" && (
                    <Loader2 className="h-4 w-4 text-zinc-400 animate-spin" />
                  )}
                  {file.status === "success" && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  )}
                  {file.status === "error" && (
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(file.name)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
