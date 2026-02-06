import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { auth } from "./auth";

type DocumentFileType = "pdf" | "markdown" | "jsonl" | "other";

const EDITOR_ACCESS = new Set<Doc<"teamMembers">["accessLevel"]>(["admin", "member"]);

const getDocumentFileType = (fileName: string, mimeType: string): DocumentFileType => {
    const lowerName = fileName.toLowerCase();
    const extension = lowerName.includes(".") ? lowerName.split(".").pop() ?? "" : "";
    const normalizedMime = mimeType.toLowerCase();

    if (extension === "pdf" || normalizedMime.includes("pdf")) return "pdf";
    if (extension === "md" || extension === "markdown" || normalizedMime === "text/markdown") return "markdown";
    if (extension === "jsonl" || normalizedMime === "application/x-ndjson" || normalizedMime === "application/jsonl") return "jsonl";

    return "other";
};

const resolveCurrentMember = async (ctx: QueryCtx | MutationCtx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId);
    if (!user) return null;

    const byUserId = await ctx.db
        .query("teamMembers")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();
    if (byUserId) return byUserId;

    const email = user.email;
    if (typeof email !== "string" || email.length === 0) return null;

    return await ctx.db
        .query("teamMembers")
        .withIndex("by_email", (q) => q.eq("email", email))
        .first();
};

const requireCurrentMember = async (ctx: QueryCtx | MutationCtx) => {
    const member = await resolveCurrentMember(ctx);
    if (!member) {
        throw new Error("You must join the team before accessing documents.");
    }
    return member;
};

const assertCanEdit = (member: Doc<"teamMembers">) => {
    if (!EDITOR_ACCESS.has(member.accessLevel)) {
        throw new Error("Read-only access. Ask an admin to grant edit access.");
    }
};

const assertCanDelete = (member: Doc<"teamMembers">, document: Doc<"documents">) => {
    if (member.accessLevel === "admin" || member._id === document.createdBy) {
        return;
    }
    throw new Error("Only admins or document owners can delete documents.");
};

// Generate an upload URL for Convex file storage.
export const generateUploadUrl = mutation({
    args: {},
    handler: async (ctx) => {
        const member = await requireCurrentMember(ctx);
        assertCanEdit(member);
        return await ctx.storage.generateUploadUrl();
    },
});

// Create a document entry after a successful file upload.
export const createFromUpload = mutation({
    args: {
        title: v.optional(v.string()),
        fileName: v.string(),
        description: v.optional(v.string()),
        tags: v.optional(v.array(v.string())),
        mimeType: v.string(),
        size: v.number(),
        storageId: v.id("_storage"),
    },
    handler: async (ctx, args) => {
        const member = await requireCurrentMember(ctx);
        assertCanEdit(member);

        const metadata = await ctx.storage.getMetadata(args.storageId);
        if (!metadata) {
            throw new Error("Uploaded file was not found in storage.");
        }

        const now = Date.now();
        const fileType = getDocumentFileType(args.fileName, args.mimeType);
        const cleanTitle = args.title?.trim() || args.fileName;

        const documentId = await ctx.db.insert("documents", {
            title: cleanTitle,
            fileName: args.fileName,
            description: args.description?.trim() || undefined,
            tags: args.tags?.filter((tag) => tag.trim().length > 0),
            fileType,
            mimeType: args.mimeType,
            size: args.size,
            storageId: args.storageId,
            createdBy: member._id,
            currentVersion: 1,
            createdAt: now,
            updatedAt: now,
        });

        await ctx.db.insert("documentVersions", {
            documentId,
            version: 1,
            storageId: args.storageId,
            fileName: args.fileName,
            mimeType: args.mimeType,
            size: args.size,
            uploadedBy: member._id,
            createdAt: now,
        });

        return documentId;
    },
});

// List documents with creator and permission hints.
export const list = query({
    args: {
        search: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const member = await resolveCurrentMember(ctx);
        if (!member) return [];

        const documents = await ctx.db
            .query("documents")
            .withIndex("by_updatedAt")
            .order("desc")
            .collect();

        const filteredDocuments = args.search?.trim()
            ? documents.filter((document) => {
                const needle = args.search!.trim().toLowerCase();
                const tags = document.tags?.join(" ").toLowerCase() ?? "";
                return (
                    document.title.toLowerCase().includes(needle) ||
                    document.fileName.toLowerCase().includes(needle) ||
                    (document.description ?? "").toLowerCase().includes(needle) ||
                    tags.includes(needle)
                );
            })
            : documents;

        return await Promise.all(
            filteredDocuments.map(async (document) => {
                const creator = await ctx.db.get(document.createdBy);
                const versionRows = await ctx.db
                    .query("documentVersions")
                    .withIndex("by_document", (q) => q.eq("documentId", document._id))
                    .collect();

                return {
                    ...document,
                    creatorName: creator?.name ?? "Unknown",
                    creatorEmail: creator?.email ?? "",
                    versionCount: versionRows.length,
                    canEdit: EDITOR_ACCESS.has(member.accessLevel),
                    canDelete: member.accessLevel === "admin" || member._id === document.createdBy,
                };
            })
        );
    },
});

// Get version history for a single document.
export const listVersions = query({
    args: {
        documentId: v.id("documents"),
    },
    handler: async (ctx, args) => {
        const member = await resolveCurrentMember(ctx);
        if (!member) return [];

        const versions = await ctx.db
            .query("documentVersions")
            .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
            .collect();

        const sortedVersions = versions.sort((a, b) => b.version - a.version);

        return await Promise.all(
            sortedVersions.map(async (version) => {
                const uploader = await ctx.db.get(version.uploadedBy);
                return {
                    ...version,
                    uploaderName: uploader?.name ?? "Unknown",
                };
            })
        );
    },
});

// Get a signed download URL for either the current document or a specific version.
export const getDownloadUrl = query({
    args: {
        documentId: v.id("documents"),
        versionId: v.optional(v.id("documentVersions")),
    },
    handler: async (ctx, args) => {
        await requireCurrentMember(ctx);

        const document = await ctx.db.get(args.documentId);
        if (!document) throw new Error("Document not found.");

        if (args.versionId) {
            const version = await ctx.db.get(args.versionId);
            if (!version || version.documentId !== document._id) {
                throw new Error("Version not found.");
            }
            const url = await ctx.storage.getUrl(version.storageId);
            return {
                url,
                fileName: version.fileName,
                mimeType: version.mimeType,
                version: version.version,
            };
        }

        const url = await ctx.storage.getUrl(document.storageId);
        return {
            url,
            fileName: document.fileName,
            mimeType: document.mimeType,
            version: document.currentVersion,
        };
    },
});

// Update document metadata such as title, description, and tags.
export const updateMetadata = mutation({
    args: {
        documentId: v.id("documents"),
        title: v.optional(v.string()),
        description: v.optional(v.string()),
        tags: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        const member = await requireCurrentMember(ctx);
        assertCanEdit(member);

        const document = await ctx.db.get(args.documentId);
        if (!document) throw new Error("Document not found.");

        const updates: Partial<Doc<"documents">> = {};

        if (args.title !== undefined) updates.title = args.title.trim() || document.title;
        if (args.description !== undefined) updates.description = args.description.trim() || undefined;
        if (args.tags !== undefined) updates.tags = args.tags.filter((tag) => tag.trim().length > 0);
        updates.updatedAt = Date.now();

        await ctx.db.patch(args.documentId, updates);
    },
});

// Upload a new version for an existing document.
export const addVersion = mutation({
    args: {
        documentId: v.id("documents"),
        storageId: v.id("_storage"),
        fileName: v.optional(v.string()),
        mimeType: v.string(),
        size: v.number(),
        changeNote: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const member = await requireCurrentMember(ctx);
        assertCanEdit(member);

        const document = await ctx.db.get(args.documentId);
        if (!document) throw new Error("Document not found.");

        const metadata = await ctx.storage.getMetadata(args.storageId);
        if (!metadata) throw new Error("Uploaded file was not found in storage.");

        const nextVersion = document.currentVersion + 1;
        const nextFileName = args.fileName ?? document.fileName;
        const now = Date.now();

        await ctx.db.insert("documentVersions", {
            documentId: document._id,
            version: nextVersion,
            storageId: args.storageId,
            fileName: nextFileName,
            mimeType: args.mimeType,
            size: args.size,
            uploadedBy: member._id,
            changeNote: args.changeNote?.trim() || undefined,
            createdAt: now,
        });

        await ctx.db.patch(document._id, {
            fileName: nextFileName,
            fileType: getDocumentFileType(nextFileName, args.mimeType),
            mimeType: args.mimeType,
            size: args.size,
            storageId: args.storageId,
            currentVersion: nextVersion,
            updatedAt: now,
        });
    },
});

// Delete a document and all of its versions.
export const remove = mutation({
    args: {
        documentId: v.id("documents"),
    },
    handler: async (ctx, args) => {
        const member = await requireCurrentMember(ctx);

        const document = await ctx.db.get(args.documentId);
        if (!document) throw new Error("Document not found.");

        assertCanDelete(member, document);

        const versions = await ctx.db
            .query("documentVersions")
            .withIndex("by_document", (q) => q.eq("documentId", document._id))
            .collect();

        const storageIds = new Set<Id<"_storage">>([document.storageId]);
        versions.forEach((version) => storageIds.add(version.storageId));

        for (const storageId of storageIds) {
            await ctx.storage.delete(storageId);
        }

        for (const version of versions) {
            await ctx.db.delete(version._id);
        }

        await ctx.db.delete(document._id);
    },
});
