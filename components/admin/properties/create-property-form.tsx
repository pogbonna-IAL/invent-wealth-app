"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createProperty } from "@/app/actions/admin/properties";
import { Loader2, ArrowLeft, X } from "lucide-react";
import Link from "next/link";
import { PropertyType, ShortletModel, PropertyStatus } from "@prisma/client";
import Image from "next/image";

const propertyTypes = [
  "APARTMENT",
  "HOUSE",
  "VILLA",
  "CONDO",
  "TOWNHOUSE",
];

const shortletModels = [
  "ENTIRE_HOME",
  "PRIVATE_ROOM",
];

const statuses = ["OPEN", "FUNDED", "CLOSED"];

export function CreatePropertyForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    city: "",
    country: "",
    addressShort: "",
    description: "",
    propertyType: "",
    shortletModel: "",
    totalShares: "",
    pricePerShare: "",
    minShares: "",
    targetRaise: "",
    projectedAnnualYieldPct: "",
    status: "OPEN",
    coverImage: "",
    coverVideo: "",
    gallery: "",
    highlights: "",
    createdAt: "",
  });

  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [coverVideoFile, setCoverVideoFile] = useState<File | null>(null);
  const [coverVideoPreview, setCoverVideoPreview] = useState<string | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      // Clear URL input when file is selected
      setFormData({ ...formData, coverImage: "" });
      // Clear video if image is selected
      if (coverVideoFile || formData.coverVideo) {
        setCoverVideoFile(null);
        setCoverVideoPreview(null);
        setFormData({ ...formData, coverVideo: "" });
      }
    }
  };

  const handleCoverVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverVideoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverVideoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      // Clear URL input when file is selected
      setFormData({ ...formData, coverVideo: "" });
      // Clear image if video is selected
      if (coverImageFile || formData.coverImage) {
        setCoverImageFile(null);
        setCoverImagePreview(null);
        setFormData({ ...formData, coverImage: "" });
      }
    }
  };

  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + galleryFiles.length > 20) {
      setError("Maximum 20 gallery images allowed");
      return;
    }
    
    const newFiles = [...galleryFiles, ...files];
    setGalleryFiles(newFiles);
    
    // Create previews
    const newPreviews: string[] = [];
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviews.push(reader.result as string);
        if (newPreviews.length === files.length) {
          setGalleryPreviews([...galleryPreviews, ...newPreviews]);
        }
      };
      reader.readAsDataURL(file);
    });
    
    // Clear URL input when files are selected
    setFormData({ ...formData, gallery: "" });
  };

  const removeCoverImage = () => {
    setCoverImageFile(null);
    setCoverImagePreview(null);
  };

  const removeCoverVideo = () => {
    setCoverVideoFile(null);
    setCoverVideoPreview(null);
  };

  const removeGalleryImage = (index: number) => {
    setGalleryFiles(galleryFiles.filter((_, i) => i !== index));
    setGalleryPreviews(galleryPreviews.filter((_, i) => i !== index));
  };

  const uploadImages = async (): Promise<{ coverImageUrl?: string; coverVideoUrl?: string; galleryUrls: string[] }> => {
    const uploadData = new FormData();
    const filesToUpload: File[] = [];
    
    if (coverImageFile) {
      uploadData.append("files", coverImageFile);
      filesToUpload.push(coverImageFile);
    }
    
    if (coverVideoFile) {
      uploadData.append("files", coverVideoFile);
      filesToUpload.push(coverVideoFile);
    }
    
    galleryFiles.forEach((file) => {
      uploadData.append("files", file);
      filesToUpload.push(file);
    });

    if (filesToUpload.length === 0) {
      return { galleryUrls: [] };
    }

    setIsUploading(true);
    try {
      const response = await fetch("/api/admin/properties/upload-images", {
        method: "POST",
        body: uploadData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to upload media");
      }

      const data = await response.json();
      const urls = data.urls as string[];
      
      // Determine which URLs are for cover image, video, and gallery
      let coverImageUrl: string | undefined;
      let coverVideoUrl: string | undefined;
      let galleryUrls: string[] = [];
      
      let urlIndex = 0;
      if (coverImageFile) {
        coverImageUrl = urls[urlIndex++];
      }
      if (coverVideoFile) {
        coverVideoUrl = urls[urlIndex++];
      }
      galleryUrls = urls.slice(urlIndex);
      
      return { coverImageUrl, coverVideoUrl, galleryUrls };
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Upload images/videos if files are selected
      let coverImageUrl = formData.coverImage;
      let coverVideoUrl = formData.coverVideo;
      let galleryUrls: string[] = [];

      if (coverImageFile || coverVideoFile || galleryFiles.length > 0) {
        const uploadResult = await uploadImages();
        if (uploadResult.coverImageUrl) {
          coverImageUrl = uploadResult.coverImageUrl;
        }
        if (uploadResult.coverVideoUrl) {
          coverVideoUrl = uploadResult.coverVideoUrl;
        }
        galleryUrls = uploadResult.galleryUrls;
      }

      // Also include URLs from text inputs
      const galleryArrayFromUrls = formData.gallery
        .split("\n")
        .map(url => url.trim())
        .filter(url => url !== "" && (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/")))
        .slice(0, 20 - galleryUrls.length);

      const allGalleryUrls = [...galleryUrls, ...galleryArrayFromUrls];

      const highlightsArray = formData.highlights
        .split("\n")
        .filter((h) => h.trim() !== "");

      const result = await createProperty({
        name: formData.name,
        slug: formData.slug,
        city: formData.city,
        country: formData.country,
        addressShort: formData.addressShort,
        description: formData.description,
        propertyType: formData.propertyType as PropertyType,
        shortletModel: formData.shortletModel as ShortletModel,
        status: formData.status as PropertyStatus,
        totalShares: parseInt(formData.totalShares),
        pricePerShare: parseFloat(formData.pricePerShare),
        minShares: parseInt(formData.minShares),
        targetRaise: formData.targetRaise ? parseFloat(formData.targetRaise) : undefined,
        projectedAnnualYieldPct: parseFloat(formData.projectedAnnualYieldPct),
        highlights: highlightsArray,
        gallery: allGalleryUrls,
        coverImage: coverImageUrl || undefined,
        coverVideo: coverVideoUrl || undefined,
        createdAt: formData.createdAt || undefined,
      });

      if (!result.success) {
        throw new Error("error" in result ? result.error : "Failed to create property");
      }

      router.push(`/admin/properties/${result.propertyId}/edit`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-generate slug from name
  const handleNameChange = (name: string) => {
    setFormData({
      ...formData,
      name,
      slug: name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, ""),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Property name and location details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Property Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
              placeholder="Luxury Beachfront Villa"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">URL Slug *</Label>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              required
              placeholder="luxury-beachfront-villa"
            />
            <p className="text-xs text-muted-foreground">
              Used in the property URL: /properties/{formData.slug || "slug"}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                required
                placeholder="Lagos"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country *</Label>
              <Input
                id="country"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                required
                placeholder="Nigeria"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="addressShort">Short Address *</Label>
            <Input
              id="addressShort"
              value={formData.addressShort}
              onChange={(e) => setFormData({ ...formData, addressShort: e.target.value })}
              required
              placeholder="Victoria Island, Lagos"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              rows={4}
              placeholder="Detailed property description..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="highlights">Highlights (one per line)</Label>
            <Textarea
              id="highlights"
              value={formData.highlights}
              onChange={(e) => setFormData({ ...formData, highlights: e.target.value })}
              rows={4}
              placeholder="Ocean view&#10;Swimming pool&#10;Modern amenities"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Property Details</CardTitle>
          <CardDescription>Type and shortlet model</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="propertyType">Property Type *</Label>
              <Select
                value={formData.propertyType}
                onValueChange={(value) => setFormData({ ...formData, propertyType: value as PropertyType })}
                required
              >
                <SelectTrigger id="propertyType">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {propertyTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="shortletModel">Shortlet Model *</Label>
              <Select
                value={formData.shortletModel}
                onValueChange={(value) => setFormData({ ...formData, shortletModel: value as ShortletModel })}
                required
              >
                <SelectTrigger id="shortletModel">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {shortletModels.map((model) => (
                    <SelectItem key={model} value={model}>
                      {model.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="coverImage">Cover Image</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  id="coverImageFile"
                  type="file"
                  accept="image/*"
                  onChange={handleCoverImageChange}
                  className="cursor-pointer"
                />
                <span className="text-sm text-muted-foreground">or</span>
                <Input
                  id="coverImage"
                  type="url"
                  value={formData.coverImage}
                  onChange={(e) => {
                    setFormData({ ...formData, coverImage: e.target.value });
                    if (e.target.value) {
                      setCoverImageFile(null);
                      setCoverImagePreview(null);
                    }
                  }}
                  placeholder="https://example.com/image.jpg"
                  className="flex-1"
                />
              </div>
              {coverImagePreview && (
                <div className="relative w-full max-w-md h-48 border rounded-md overflow-hidden">
                  <Image
                    src={coverImagePreview}
                    alt="Cover preview"
                    fill
                    className="object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={removeCoverImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {formData.coverImage && !coverImagePreview && (
                <div className="relative w-full max-w-md h-48 border rounded-md overflow-hidden">
                  <Image
                    src={formData.coverImage}
                    alt="Cover preview"
                    fill
                    className="object-cover"
                    onError={() => setFormData({ ...formData, coverImage: "" })}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="coverVideo">Cover Video (Alternative to Cover Image)</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  id="coverVideoFile"
                  type="file"
                  accept="video/*"
                  onChange={handleCoverVideoChange}
                  className="cursor-pointer"
                />
                <span className="text-sm text-muted-foreground">or</span>
                <Input
                  id="coverVideo"
                  type="url"
                  value={formData.coverVideo}
                  onChange={(e) => {
                    setFormData({ ...formData, coverVideo: e.target.value });
                    if (e.target.value) {
                      setCoverVideoFile(null);
                      setCoverVideoPreview(null);
                    }
                    // Clear image if video URL is entered
                    if (e.target.value && (coverImageFile || formData.coverImage)) {
                      setCoverImageFile(null);
                      setCoverImagePreview(null);
                      setFormData({ ...formData, coverImage: "" });
                    }
                  }}
                  placeholder="https://example.com/video.mp4"
                  className="flex-1"
                />
              </div>
              {coverVideoPreview && (
                <div className="relative w-full max-w-md border rounded-md overflow-hidden">
                  <video
                    src={coverVideoPreview}
                    controls
                    className="w-full h-auto max-h-96"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={removeCoverVideo}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {formData.coverVideo && !coverVideoPreview && (
                <div className="relative w-full max-w-md border rounded-md overflow-hidden">
                  <video
                    src={formData.coverVideo}
                    controls
                    className="w-full h-auto max-h-96"
                    onError={() => setFormData({ ...formData, coverVideo: "" })}
                  />
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Upload a video file (MP4, WebM, OGG, MOV) or enter a video URL. Maximum size: 100MB. 
                If both image and video are provided, video takes precedence.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="gallery">Gallery Images (1-20 images)</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  id="galleryFiles"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleGalleryChange}
                  className="cursor-pointer"
                />
                <span className="text-sm text-muted-foreground">or</span>
                <Textarea
                  id="gallery"
                  value={formData.gallery}
                  onChange={(e) => {
                    const lines = e.target.value.split("\n").filter(line => line.trim() !== "");
                    if (lines.length <= 20) {
                      setFormData({ ...formData, gallery: e.target.value });
                      if (e.target.value) {
                        setGalleryFiles([]);
                        setGalleryPreviews([]);
                      }
                    }
                  }}
                  rows={4}
                  placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Upload files or enter URLs (one per line). Maximum 20 images total.
                {galleryFiles.length > 0 && ` ${galleryFiles.length} file(s) selected.`}
                {formData.gallery.split("\n").filter(l => l.trim()).length > 0 && 
                  ` ${formData.gallery.split("\n").filter(l => l.trim()).length} URL(s) entered.`}
              </p>
              {(galleryPreviews.length > 0 || formData.gallery) && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                  {galleryPreviews.map((preview, index) => (
                    <div key={index} className="relative w-full h-32 border rounded-md overflow-hidden">
                      <Image
                        src={preview}
                        alt={`Gallery preview ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6"
                        onClick={() => removeGalleryImage(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  {formData.gallery.split("\n").filter(l => l.trim()).map((url, index) => (
                    <div key={`url-${index}`} className="relative w-full h-32 border rounded-md overflow-hidden">
                      <Image
                        src={url.trim()}
                        alt={`Gallery preview ${index + 1}`}
                        fill
                        className="object-cover"
                        onError={() => {
                          const urls = formData.gallery.split("\n").filter(l => l.trim());
                          urls.splice(index, 1);
                          setFormData({ ...formData, gallery: urls.join("\n") });
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Investment Details</CardTitle>
          <CardDescription>Shares, pricing, and funding information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="createdAt">Property Creation Date</Label>
            <Input
              id="createdAt"
              type="datetime-local"
              value={formData.createdAt}
              onChange={(e) => setFormData({ ...formData, createdAt: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to use current date. Set a past date to backdate the property creation (for importing existing properties).
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="totalShares">Total Shares *</Label>
              <Input
                id="totalShares"
                type="number"
                value={formData.totalShares}
                onChange={(e) => setFormData({ ...formData, totalShares: e.target.value })}
                required
                min="1"
                placeholder="100000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pricePerShare">Price per Share (₦) *</Label>
              <Input
                id="pricePerShare"
                type="number"
                step="0.01"
                value={formData.pricePerShare}
                onChange={(e) => setFormData({ ...formData, pricePerShare: e.target.value })}
                required
                min="0.01"
                placeholder="15000.00"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="minShares">Minimum Shares *</Label>
              <Input
                id="minShares"
                type="number"
                value={formData.minShares}
                onChange={(e) => setFormData({ ...formData, minShares: e.target.value })}
                required
                min="1"
                placeholder="100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetRaise">Target Raise (₦)</Label>
              <Input
                id="targetRaise"
                type="number"
                step="0.01"
                value={formData.targetRaise}
                onChange={(e) => setFormData({ ...formData, targetRaise: e.target.value })}
                placeholder="1500000000.00"
              />
              <p className="text-xs text-muted-foreground">
                Optional. Auto-calculated if not provided
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="projectedAnnualYieldPct">Projected Annual Yield (%) *</Label>
              <Input
                id="projectedAnnualYieldPct"
                type="number"
                step="0.01"
                value={formData.projectedAnnualYieldPct}
                onChange={(e) => setFormData({ ...formData, projectedAnnualYieldPct: e.target.value })}
                required
                min="0"
                max="100"
                placeholder="8.50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value as PropertyStatus })}
                required
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-4">
        <Link href="/admin/properties">
          <Button type="button" variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Cancel
          </Button>
        </Link>
        <Button type="submit" disabled={isLoading || isUploading}>
          {(isLoading || isUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isUploading ? "Uploading Images..." : isLoading ? "Creating Property..." : "Create Property"}
        </Button>
      </div>
    </form>
  );
}

