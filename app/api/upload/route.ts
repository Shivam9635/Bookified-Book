import { NextResponse } from “next/server”;
import { handleUpload, type HandleUploadBody } from “@vercel/blob/client”;
import { auth } from “@clerk/nextjs/server”;
import { MAX_FILE_SIZE } from “@/lib/constants”;

export async function POST(request: Request): Promise {
try {
const body = (await request.json()) as HandleUploadBody;

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
        console.error("Vercel Blob read-write token is missing.");
        return NextResponse.json(
            {
                error: "File upload is not configured. Please contact the administrator.",
            },
            { status: 500 }
        );
    }
    const jsonResponse = await handleUpload({
        token,
        body,
        request,
        onBeforeGenerateToken: async () => {
            const { userId } = await auth();
            if (!userId) {
                throw new Error("Unauthorized: User not authenticated");
            }
            return {
                allowedContentTypes: [
                    "application/pdf",
                    "image/jpeg",
                    "image/png",
                    "image/webp",
                ],
                addRandomSuffix: true,
                maximumSizeInBytes: MAX_FILE_SIZE,
                tokenPayload: JSON.stringify({ userId }),
            };
        },
        onUploadCompleted: async ({ blob, tokenPayload }) => {
            console.log("File uploaded to Blob:", blob.url);
            const payload = tokenPayload
                ? JSON.parse(tokenPayload)
                : null;
            const userId = payload?.userId;
            console.log("Upload completed for user:", userId);
            // TODO: Save the uploaded file details to the database.
        },
    });
    return NextResponse.json(jsonResponse);
} catch (e) {
    console.error("Upload error:", e);
    const message =
        e instanceof Error ? e.message : "An unknown error occurred";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
        {
            error: status === 401 ? "Unauthorized" : "Upload failed",
        },
        { status }
    );
}

}
