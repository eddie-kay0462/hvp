# Image Upload Implementation Guide

## 📋 Complete Step-by-Step Guide

This guide covers the complete implementation of image upload functionality for services, from database setup to frontend display.

---

## 🗄️ Step 1: Database Setup

### 1.1 Add `image_urls` Column to Services Table

Run this SQL in your Supabase SQL Editor:

```sql
-- Add image_urls column to services table
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS image_urls TEXT[];

-- Add comment for documentation
COMMENT ON COLUMN services.image_urls IS 'Array of image URLs stored in Supabase Storage';
```

**Note**: We're using `TEXT[]` (array of text) to store multiple image URLs per service.

---

## 📦 Step 2: Supabase Storage Setup

### 2.1 Create Storage Bucket

1. Go to your Supabase Dashboard
2. Navigate to **Storage** → **Buckets**
3. Click **New Bucket**
4. Configure:
   - **Name**: `service-images`
   - **Public**: ✅ **Yes** (so images can be accessed via public URLs)
   - **File size limit**: 5 MB (or your preferred limit)
   - **Allowed MIME types**: `image/jpeg, image/png, image/webp, image/gif`

### 2.2 Set Up Storage Policies

**⚠️ IMPORTANT**: You must set up storage policies or you'll get "row-level security policy" errors!

Run this SQL in your Supabase SQL Editor (see `QUICK_FIX_STORAGE.sql` for a simpler version):

```sql
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;

-- Allow authenticated users to upload any file to service-images bucket
CREATE POLICY "Allow authenticated uploads"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'service-images');

-- Allow public to read from service-images bucket
CREATE POLICY "Allow public reads"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'service-images');

-- Allow authenticated users to update their files
CREATE POLICY "Allow authenticated updates"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'service-images')
WITH CHECK (bucket_id = 'service-images');

-- Allow authenticated users to delete their files
CREATE POLICY "Allow authenticated deletes"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'service-images');
```

**Quick Fix**: Use the `QUICK_FIX_STORAGE.sql` file for a simpler setup that works immediately.

**More Secure Option**: See `FIX_STORAGE_POLICIES.sql` for folder-based restrictions (users can only upload to their own folders).

---

## 💻 Step 3: Frontend Implementation

### 3.1 Update Service Interface

The `Service` interface has been updated in `SellerServices.tsx`:

```typescript
interface Service {
  // ... other fields
  image_urls: string[] | null;
}
```

### 3.2 Image Upload Component

The image upload functionality has been added to the edit service form with:

- **File input** (hidden, triggered by button)
- **Image preview grid** (shows uploaded images)
- **Remove image** functionality
- **Upload progress** indicator
- **File validation** (type and size)

### 3.3 Upload Function Flow

```typescript
handleImageUpload(files: FileList) {
  1. Validate each file (type, size)
  2. Create unique filename: {userId}/{timestamp}-{random}.{ext}
  3. Upload to Supabase Storage bucket 'service-images'
  4. Get public URL from storage
  5. Add URL to imageUrls array
  6. Update service with image_urls array
}
```

---

## 🔄 Step 4: Update All Service Display Components

### 4.1 ServiceCard Component

**File**: `frontend/src/components/services/ServiceCard.tsx`

Already expects `imageUrls: string[]` prop. Update where it's used to pass `image_urls`:

```typescript
<ServiceCard
  // ... other props
  imageUrls={service.image_urls || []}
/>
```

### 4.2 ServiceDetail Page

**File**: `frontend/src/pages/ServiceDetail.tsx`

Update to display images from `image_urls`:

```typescript
// In fetchServiceDetails, after fetching service:
const images = service.image_urls || ['/placeholder.svg'];
```

### 4.3 Services List Page

**File**: `frontend/src/pages/Services.tsx`

Update service mapping to include `image_urls`:

```typescript
// When mapping services for ServiceCard
imageUrls: service.image_urls || []
```

### 4.4 Featured Services Component

**File**: `frontend/src/components/landing/FeaturedServices.tsx`

Update to use `image_urls`:

```typescript
// When creating service cards
imageUrls: service.image_urls || []
```

### 4.5 Seller Profile Page

**File**: `frontend/src/pages/SellerProfile.tsx`

Update service cards to use `image_urls`:

```typescript
<ServiceCard
  // ... other props
  imageUrls={service.image_urls || []}
/>
```

---

## 📝 Step 5: Update Create Service Form

Add image upload to the **Create Service** dialog in `SellerServices.tsx`:

1. Add the same image upload UI section
2. Include `imageUrls` in the create service API call
3. Update `handleCreateService` to save `image_urls`

**Example**:

```typescript
await api.sellers.createService({
  // ... other fields
  image_urls: imageUrls.length > 0 ? imageUrls : null,
});
```

---

## 🎨 Step 6: Update Service Creation (ListService.tsx)

**File**: `frontend/src/pages/ListService.tsx`

Add image upload functionality similar to the edit form:

1. Add image upload state
2. Add image upload UI
3. Include images when creating service

---

## 🔧 Step 7: Backend API Update (if using backend)

If you're using a backend API for service creation, update it to accept `image_urls`:

```javascript
// In your service creation endpoint
const { image_urls } = req.body;

// Save to database
await supabase
  .from('services')
  .insert({
    // ... other fields
    image_urls: image_urls || null,
  });
```

---

## ✅ Step 8: Testing Checklist

- [ ] Upload single image
- [ ] Upload multiple images
- [ ] Remove uploaded image
- [ ] Edit service and add more images
- [ ] Verify images display on service cards
- [ ] Verify images display on service detail page
- [ ] Verify images display on featured services
- [ ] Test file size validation (try > 5MB)
- [ ] Test file type validation (try non-image file)
- [ ] Verify images persist after page refresh
- [ ] Test with different browsers

---

## 🐛 Troubleshooting

### Issue: "Bucket not found"
**Solution**: Make sure the bucket `service-images` exists in Supabase Storage

### Issue: "Permission denied"
**Solution**: Check Storage policies are set correctly (see Step 2.2)

### Issue: Images not displaying
**Solution**: 
- Check if bucket is set to **Public**
- Verify image URLs are correct
- Check browser console for CORS errors

### Issue: Upload fails silently
**Solution**:
- Check browser console for errors
- Verify file size is under limit
- Check file type is allowed
- Verify user is authenticated

### Issue: Images not saving to database
**Solution**:
- Check if `image_urls` column exists
- Verify the update query includes `image_urls`
- Check database logs for errors

---

## 📊 Database Migration Script

Complete SQL script for database setup:

```sql
-- Step 1: Add image_urls column
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS image_urls TEXT[];

-- Step 2: Create index for better query performance (optional)
CREATE INDEX IF NOT EXISTS idx_services_image_urls 
ON services USING GIN (image_urls);

-- Step 3: Add comment
COMMENT ON COLUMN services.image_urls IS 'Array of image URLs from Supabase Storage';
```

---

## 🔐 Security Considerations

1. **File Validation**: Always validate file type and size on both client and server
2. **User Isolation**: Users can only upload to their own folders
3. **Public Access**: Service images are public (intentional for marketplace)
4. **File Size Limits**: Set appropriate limits to prevent abuse
5. **Rate Limiting**: Consider adding rate limits for uploads

---

## 🚀 Next Steps

1. **Image Optimization**: Add image compression before upload
2. **Image Cropping**: Add image cropping/editing functionality
3. **Image Ordering**: Allow users to reorder images
4. **Image Deletion**: Implement proper cleanup when images are removed
5. **CDN Integration**: Consider using a CDN for better performance
6. **Lazy Loading**: Implement lazy loading for better performance

---

## 📚 Additional Resources

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Supabase Storage JavaScript Client](https://supabase.com/docs/reference/javascript/storage)
- [File Upload Best Practices](https://supabase.com/docs/guides/storage/uploads)

---

## 📝 Summary

**What we've implemented:**
1. ✅ Database column for image URLs
2. ✅ Supabase Storage bucket setup
3. ✅ Image upload UI in edit service form
4. ✅ Image upload functionality
5. ✅ Image preview and removal
6. ✅ File validation

**What needs to be done:**
1. ⏳ Update all service display components to use `image_urls`
2. ⏳ Add image upload to create service form
3. ⏳ Update backend API (if applicable)
4. ⏳ Test thoroughly
5. ⏳ Add image upload to ListService page

---

**Last Updated**: December 2024

