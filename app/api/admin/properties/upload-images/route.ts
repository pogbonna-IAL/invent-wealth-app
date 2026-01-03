import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { requireAdmin } from "@/server/services/admin.service";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await requireAdmin(session.user.id);

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    // Validate file types and sizes
    const allowedImageTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
    const allowedVideoTypes = ["video/mp4", "video/webm", "video/ogg", "video/quicktime"];
    const allowedTypes = [...allowedImageTypes, ...allowedVideoTypes];
    const maxImageSize = 10 * 1024 * 1024; // 10MB for images
    const maxVideoSize = 100 * 1024 * 1024; // 100MB for videos

    const uploadedUrls: string[] = [];

    // Ensure uploads directories exist
    const uploadsDir = join(process.cwd(), "public", "uploads", "properties");
    const videosDir = join(process.cwd(), "public", "uploads", "properties", "videos");
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }
    if (!existsSync(videosDir)) {
      await mkdir(videosDir, { recursive: true });
    }

    for (const file of files) {
      // Validate file type
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { error: `Invalid file type: ${file.type}. Allowed types: ${allowedTypes.join(", ")}` },
          { status: 400 }
        );
      }

      // Validate file size based on type
      const isVideo = allowedVideoTypes.includes(file.type);
      const maxSize = isVideo ? maxVideoSize : maxImageSize;
      const maxSizeLabel = isVideo ? "100MB" : "10MB";
      
      if (file.size > maxSize) {
        return NextResponse.json(
          { error: `File ${file.name} is too large. Maximum size is ${maxSizeLabel}` },
          { status: 400 }
        );
      }

      // Generate unique filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const extension = file.name.split(".").pop();
      const filename = `${timestamp}-${randomString}.${extension}`;
      
      // Save videos in a separate subdirectory
      const targetDir = isVideo ? videosDir : uploadsDir;
      const filepath = join(targetDir, filename);

      // Convert file to buffer and save
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(filepath, buffer);

      // Return the public URL path
      const publicUrl = isVideo 
        ? `/uploads/properties/videos/${filename}`
        : `/uploads/properties/${filename}`;
      uploadedUrls.push(publicUrl);
    }

    return NextResponse.json({ success: true, urls: uploadedUrls });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload images" },
      { status: 500 }
    );
  }
}

