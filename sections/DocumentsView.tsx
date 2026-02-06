'use client';

import { useMemo, useRef, useState } from 'react';
import {
  FileText,
  FileCode2,
  FileJson,
  File as FileIcon,
  Upload,
  Plus,
  Search,
  Download,
  Eye,
  Pencil,
  Trash2,
  History,
  Loader2,
  ShieldAlert,
  X,
} from 'lucide-react';
import { useConvex, useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';

type TextDocType = 'markdown' | 'jsonl';

interface ListedDocument {
  _id: Id<'documents'>;
  title: string;
  fileName: string;
  description?: string;
  tags?: string[];
  fileType: 'pdf' | 'markdown' | 'jsonl' | 'other';
  mimeType: string;
  size: number;
  currentVersion: number;
  updatedAt: number;
  creatorName: string;
  creatorEmail: string;
  versionCount: number;
  canEdit: boolean;
  canDelete: boolean;
}

interface ListedVersion {
  _id: Id<'documentVersions'>;
  version: number;
  fileName: string;
  mimeType: string;
  size: number;
  uploaderName: string;
  changeNote?: string;
  createdAt: number;
}

const ACCEPTED_FILE_TYPES = '.pdf,.md,.markdown,.jsonl,.json';

const stripExtension = (fileName: string) => {
  const index = fileName.lastIndexOf('.');
  return index > 0 ? fileName.slice(0, index) : fileName;
};

const formatBytes = (size: number) => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileIcon = (fileType: ListedDocument['fileType']) => {
  switch (fileType) {
    case 'pdf':
      return <FileText className="w-5 h-5 text-red-400" />;
    case 'markdown':
      return <FileCode2 className="w-5 h-5 text-blue-400" />;
    case 'jsonl':
      return <FileJson className="w-5 h-5 text-emerald-400" />;
    default:
      return <FileIcon className="w-5 h-5 text-gray-400" />;
  }
};

const getTextMimeType = (type: TextDocType) => (type === 'markdown' ? 'text/markdown' : 'application/x-ndjson');
const getTextExtension = (type: TextDocType) => (type === 'markdown' ? '.md' : '.jsonl');

export function DocumentsView() {
  const convex = useConvex();
  const fileUploadRef = useRef<HTMLInputElement>(null);
  const versionUploadRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [versionTarget, setVersionTarget] = useState<ListedDocument | null>(null);
  const [historyTarget, setHistoryTarget] = useState<ListedDocument | null>(null);

  const [showCreateTextModal, setShowCreateTextModal] = useState(false);
  const [newTextType, setNewTextType] = useState<TextDocType>('markdown');
  const [newTextTitle, setNewTextTitle] = useState('');
  const [newTextContent, setNewTextContent] = useState('');
  const [isCreatingText, setIsCreatingText] = useState(false);

  const [textEditorTarget, setTextEditorTarget] = useState<ListedDocument | null>(null);
  const [textEditorContent, setTextEditorContent] = useState('');
  const [textEditorLoading, setTextEditorLoading] = useState(false);
  const [textEditorSaving, setTextEditorSaving] = useState(false);

  const currentMember = useQuery(api.teamMembers.getCurrentMember);
  const documents = (useQuery(api.documents.list, { search: searchQuery.trim() || undefined }) ?? []) as ListedDocument[];
  const historyVersions = (
    useQuery(
      api.documents.listVersions,
      historyTarget ? { documentId: historyTarget._id } : 'skip'
    ) ?? []
  ) as ListedVersion[];

  const generateUploadUrl = useMutation(api.documents.generateUploadUrl);
  const createFromUpload = useMutation(api.documents.createFromUpload);
  const addVersion = useMutation(api.documents.addVersion);
  const removeDocument = useMutation(api.documents.remove);

  const canEditDocuments = currentMember?.accessLevel === 'admin' || currentMember?.accessLevel === 'member';
  const isViewer = currentMember?.accessLevel === 'viewer';

  const uploadFileToConvexStorage = async (file: File) => {
    const postUrl = await generateUploadUrl({});
    const response = await fetch(postUrl, {
      method: 'POST',
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
      },
      body: file,
    });

    if (!response.ok) {
      throw new Error('Upload failed while sending the file.');
    }

    const payload = await response.json();
    return payload.storageId as Id<'_storage'>;
  };

  const createDocumentFromFile = async (file: File, title?: string, description?: string) => {
    const storageId = await uploadFileToConvexStorage(file);
    await createFromUpload({
      title: title?.trim() || stripExtension(file.name),
      fileName: file.name,
      description,
      mimeType: file.type || 'application/octet-stream',
      size: file.size,
      storageId,
    });
  };

  const refreshFeedback = (message: string) => {
    setFeedback(message);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleUploadClick = () => {
    if (!canEditDocuments) return;
    fileUploadRef.current?.click();
  };

  const handleUploadFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setError(null);
    setIsUploading(true);

    try {
      for (const file of Array.from(files)) {
        await createDocumentFromFile(file);
      }
      refreshFeedback(`Uploaded ${files.length} file${files.length > 1 ? 's' : ''}.`);
    } catch (uploadError) {
      console.error(uploadError);
      setError(uploadError instanceof Error ? uploadError.message : 'Failed to upload files.');
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const handleVersionUploadClick = (document: ListedDocument) => {
    if (!document.canEdit) return;
    setVersionTarget(document);
    versionUploadRef.current?.click();
  };

  const handleUploadVersionFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !versionTarget) return;

    setError(null);
    setIsUploading(true);

    try {
      const storageId = await uploadFileToConvexStorage(file);
      await addVersion({
        documentId: versionTarget._id,
        storageId,
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        changeNote: 'Uploaded a new file version',
      });
      refreshFeedback(`Uploaded v${versionTarget.currentVersion + 1} for ${versionTarget.title}.`);
    } catch (uploadError) {
      console.error(uploadError);
      setError(uploadError instanceof Error ? uploadError.message : 'Failed to upload new version.');
    } finally {
      setVersionTarget(null);
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const openDownload = async (document: ListedDocument, versionId?: Id<'documentVersions'>) => {
    try {
      const payload = await convex.query(api.documents.getDownloadUrl, {
        documentId: document._id,
        versionId,
      });
      if (!payload?.url) {
        throw new Error('Download URL is unavailable.');
      }
      window.open(payload.url, '_blank', 'noopener,noreferrer');
    } catch (downloadError) {
      console.error(downloadError);
      setError(downloadError instanceof Error ? downloadError.message : 'Failed to open download.');
    }
  };

  const openTextEditor = async (document: ListedDocument) => {
    if (document.fileType !== 'markdown' && document.fileType !== 'jsonl') return;

    setError(null);
    setTextEditorTarget(document);
    setTextEditorLoading(true);
    setTextEditorContent('');

    try {
      const payload = await convex.query(api.documents.getDownloadUrl, {
        documentId: document._id,
      });
      if (!payload?.url) {
        throw new Error('Unable to load this document.');
      }
      const response = await fetch(payload.url);
      if (!response.ok) {
        throw new Error('Failed to fetch text content.');
      }
      const content = await response.text();
      setTextEditorContent(content);
    } catch (editorError) {
      console.error(editorError);
      setError(editorError instanceof Error ? editorError.message : 'Failed to open document.');
      setTextEditorTarget(null);
    } finally {
      setTextEditorLoading(false);
    }
  };

  const saveTextEditorAsNewVersion = async () => {
    if (!textEditorTarget) return;

    setTextEditorSaving(true);
    setError(null);

    try {
      const textType: TextDocType = textEditorTarget.fileType === 'jsonl' ? 'jsonl' : 'markdown';
      const mimeType = getTextMimeType(textType);
      const file = new File([textEditorContent], textEditorTarget.fileName, { type: mimeType });
      const storageId = await uploadFileToConvexStorage(file);

      await addVersion({
        documentId: textEditorTarget._id,
        storageId,
        fileName: textEditorTarget.fileName,
        mimeType,
        size: file.size,
        changeNote: 'Edited in TeamSync',
      });

      refreshFeedback(`Saved a new version for ${textEditorTarget.title}.`);
      setTextEditorTarget(null);
      setTextEditorContent('');
    } catch (saveError) {
      console.error(saveError);
      setError(saveError instanceof Error ? saveError.message : 'Failed to save new version.');
    } finally {
      setTextEditorSaving(false);
    }
  };

  const handleDeleteDocument = async (document: ListedDocument) => {
    if (!document.canDelete) return;
    const confirmed = window.confirm(`Delete "${document.title}" and all versions?`);
    if (!confirmed) return;

    setError(null);
    try {
      await removeDocument({ documentId: document._id });
      refreshFeedback(`Deleted ${document.title}.`);
    } catch (deleteError) {
      console.error(deleteError);
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete document.');
    }
  };

  const createTextDocument = async () => {
    if (!newTextTitle.trim()) return;

    setError(null);
    setIsCreatingText(true);

    try {
      const mimeType = getTextMimeType(newTextType);
      const extension = getTextExtension(newTextType);
      const fileName = `${newTextTitle.trim().replace(/\s+/g, '-')}${extension}`;
      const file = new File([newTextContent], fileName, { type: mimeType });

      await createDocumentFromFile(file, newTextTitle.trim(), 'Created in TeamSync');

      setShowCreateTextModal(false);
      setNewTextTitle('');
      setNewTextContent('');
      setNewTextType('markdown');
      refreshFeedback(`Created ${newTextType === 'markdown' ? 'Markdown' : 'JSONL'} document.`);
    } catch (createError) {
      console.error(createError);
      setError(createError instanceof Error ? createError.message : 'Failed to create text document.');
    } finally {
      setIsCreatingText(false);
    }
  };

  const emptyStateLabel = useMemo(() => {
    if (searchQuery.trim()) {
      return `No documents match "${searchQuery.trim()}".`;
    }
    return 'No documents yet. Upload your first file to get started.';
  }, [searchQuery]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Project Documents</h1>
          <p className="text-gray-400 text-sm">
            Upload, share, and version documents for the whole team.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search documents..."
              className="w-64 bg-[#181818] border border-[#232323] rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#F0FF7A] transition-colors"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowCreateTextModal(true)}
            disabled={!canEditDocuments}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#232323] bg-[#181818] text-sm hover:border-[#333] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            New Text Doc
          </button>

          <button
            type="button"
            onClick={handleUploadClick}
            disabled={!canEditDocuments || isUploading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#F0FF7A] text-[#010101] text-sm font-medium hover:shadow-lg hover:shadow-[#F0FF7A]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Upload Files
          </button>
        </div>
      </div>

      {isViewer && (
        <div className="flex items-start gap-3 p-4 border border-amber-400/20 bg-amber-400/10 rounded-xl">
          <ShieldAlert className="w-5 h-5 text-amber-300 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-200">Read-only access</p>
            <p className="text-xs text-amber-100/80">
              Viewers can view and download documents but cannot upload, edit, or delete.
            </p>
          </div>
        </div>
      )}

      {feedback && (
        <div className="p-3 border border-green-500/30 bg-green-500/10 rounded-lg text-sm text-green-300">
          {feedback}
        </div>
      )}

      {error && (
        <div className="p-3 border border-red-500/30 bg-red-500/10 rounded-lg text-sm text-red-300">
          {error}
        </div>
      )}

      <input
        ref={fileUploadRef}
        type="file"
        multiple
        accept={ACCEPTED_FILE_TYPES}
        onChange={handleUploadFiles}
        className="hidden"
      />

      <input
        ref={versionUploadRef}
        type="file"
        accept={ACCEPTED_FILE_TYPES}
        onChange={handleUploadVersionFile}
        className="hidden"
      />

      <div className="bg-[#0B0B0B] border border-[#232323] rounded-xl overflow-hidden">
        <div className="grid grid-cols-12 px-5 py-3 border-b border-[#232323] text-xs uppercase tracking-wide text-gray-500">
          <div className="col-span-5">Document</div>
          <div className="col-span-2 hidden md:block">Updated</div>
          <div className="col-span-2 hidden lg:block">Owner</div>
          <div className="col-span-1 hidden md:block">Size</div>
          <div className="col-span-7 md:col-span-4 lg:col-span-2 text-right">Actions</div>
        </div>

        {documents.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            <FileText className="w-10 h-10 mx-auto mb-3 text-gray-600" />
            <p>{emptyStateLabel}</p>
          </div>
        ) : (
          <div className="divide-y divide-[#232323]">
            {documents.map((document) => (
              <div key={document._id} className="grid grid-cols-12 px-5 py-4 items-center gap-2 hover:bg-[#141414] transition-colors">
                <div className="col-span-5 min-w-0">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-[#181818] border border-[#232323]">
                      {getFileIcon(document.fileType)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{document.title}</p>
                      <p className="text-xs text-gray-500 truncate">{document.fileName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[#181818] text-gray-400 border border-[#232323]">
                          v{document.currentVersion}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[#181818] text-gray-400 border border-[#232323] uppercase">
                          {document.fileType}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-span-2 hidden md:block text-xs text-gray-400">
                  {new Date(document.updatedAt).toLocaleDateString()}
                </div>
                <div className="col-span-2 hidden lg:block text-xs text-gray-400 truncate">
                  {document.creatorName}
                </div>
                <div className="col-span-1 hidden md:block text-xs text-gray-400">
                  {formatBytes(document.size)}
                </div>

                <div className="col-span-7 md:col-span-4 lg:col-span-2 flex justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (document.fileType === 'markdown' || document.fileType === 'jsonl') {
                        void openTextEditor(document);
                        return;
                      }
                      void openDownload(document);
                    }}
                    className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#181818] transition-colors"
                    title="View"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => void openDownload(document)}
                    className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#181818] transition-colors"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setHistoryTarget(document)}
                    className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#181818] transition-colors"
                    title="Version history"
                  >
                    <History className="w-4 h-4" />
                  </button>

                  {document.canEdit && (
                    <button
                      type="button"
                      onClick={() => handleVersionUploadClick(document)}
                      className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#181818] transition-colors"
                      title="Upload new version"
                    >
                      <Upload className="w-4 h-4" />
                    </button>
                  )}

                  {(document.fileType === 'markdown' || document.fileType === 'jsonl') && document.canEdit && (
                    <button
                      type="button"
                      onClick={() => void openTextEditor(document)}
                      className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#181818] transition-colors"
                      title="Edit text document"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}

                  {document.canDelete && (
                    <button
                      type="button"
                      onClick={() => void handleDeleteDocument(document)}
                      className="p-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                      title="Delete document"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreateTextModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0B0B0B] border border-[#232323] rounded-xl w-full max-w-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#232323] flex items-center justify-between">
              <h2 className="font-semibold">Create Text Document</h2>
              <button
                type="button"
                onClick={() => setShowCreateTextModal(false)}
                className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-[#181818]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-sm text-gray-400 mb-2">Title</label>
                  <input
                    type="text"
                    value={newTextTitle}
                    onChange={(event) => setNewTextTitle(event.target.value)}
                    placeholder="Architecture notes"
                    className="w-full bg-[#181818] border border-[#232323] rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#F0FF7A]"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Type</label>
                  <select
                    value={newTextType}
                    onChange={(event) => setNewTextType(event.target.value as TextDocType)}
                    className="w-full bg-[#181818] border border-[#232323] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#F0FF7A]"
                  >
                    <option value="markdown">Markdown (.md)</option>
                    <option value="jsonl">JSONL (.jsonl)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Content</label>
                <textarea
                  rows={12}
                  value={newTextContent}
                  onChange={(event) => setNewTextContent(event.target.value)}
                  placeholder={newTextType === 'markdown' ? '# Title\n\nWrite your notes...' : '{"id":1,"value":"example"}'}
                  className="w-full bg-[#181818] border border-[#232323] rounded-lg px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#F0FF7A] resize-y font-mono"
                />
              </div>
            </div>

            <div className="px-5 py-4 border-t border-[#232323] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCreateTextModal(false)}
                className="px-4 py-2 rounded-lg bg-[#181818] text-sm hover:bg-[#232323] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!newTextTitle.trim() || isCreatingText}
                onClick={() => void createTextDocument()}
                className="px-4 py-2 rounded-lg bg-[#F0FF7A] text-[#010101] text-sm font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {isCreatingText && <Loader2 className="w-4 h-4 animate-spin" />}
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {textEditorTarget && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0B0B0B] border border-[#232323] rounded-xl w-full max-w-4xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#232323] flex items-center justify-between">
              <div className="min-w-0">
                <h2 className="font-semibold truncate">{textEditorTarget.title}</h2>
                <p className="text-xs text-gray-500 truncate">{textEditorTarget.fileName}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setTextEditorTarget(null);
                  setTextEditorContent('');
                }}
                className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-[#181818]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5">
              {textEditorLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-[#F0FF7A] animate-spin" />
                </div>
              ) : (
                <textarea
                  rows={18}
                  value={textEditorContent}
                  onChange={(event) => setTextEditorContent(event.target.value)}
                  readOnly={!textEditorTarget.canEdit}
                  className="w-full bg-[#181818] border border-[#232323] rounded-lg px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#F0FF7A] resize-y font-mono disabled:opacity-60"
                />
              )}
            </div>

            <div className="px-5 py-4 border-t border-[#232323] flex items-center justify-between">
              <p className="text-xs text-gray-500">
                {textEditorTarget.canEdit ? 'Saving creates a new version.' : 'Read-only preview'}
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => void openDownload(textEditorTarget)}
                  className="px-4 py-2 rounded-lg bg-[#181818] text-sm hover:bg-[#232323] transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
                {textEditorTarget.canEdit && (
                  <button
                    type="button"
                    disabled={textEditorSaving || textEditorLoading}
                    onClick={() => void saveTextEditorAsNewVersion()}
                    className="px-4 py-2 rounded-lg bg-[#F0FF7A] text-[#010101] text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                  >
                    {textEditorSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                    Save New Version
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {historyTarget && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0B0B0B] border border-[#232323] rounded-xl w-full max-w-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#232323] flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Version History</h2>
                <p className="text-xs text-gray-500">{historyTarget.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryTarget(null)}
                className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-[#181818]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-[420px] overflow-y-auto">
              {historyVersions.length === 0 ? (
                <p className="p-5 text-sm text-gray-500">No versions available.</p>
              ) : (
                <div className="divide-y divide-[#232323]">
                  {historyVersions.map((version) => (
                    <div key={version._id} className="px-5 py-4 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">Version {version.version}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {new Date(version.createdAt).toLocaleString()} • {version.uploaderName}
                        </p>
                        {version.changeNote && (
                          <p className="text-xs text-gray-400 mt-1 truncate">{version.changeNote}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => void openDownload(historyTarget, version._id)}
                        className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#181818] transition-colors"
                        title="Open version"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
