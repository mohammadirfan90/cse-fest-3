import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { uploadImage } from "@/lib/cloudinary";

const verificationSchema = z.object({
  id_front_base64: z.string().min(1, "Front image is required"),
  id_back_base64: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized access. Please login first." },
        { status: 401 }
      );
    }

    // 2. Validate request body
    const body = await req.json();
    const parseResult = verificationSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: parseResult.error.issues[0]?.message || "Validation failed",
        },
        { status: 400 }
      );
    }

    // 3. Upload to Cloudinary using standard pathing
    const frontUpload = await uploadImage(
      parseResult.data.id_front_base64,
      `csefest/verifications/${user.id}/front`
    );

    let backUploadUrl = null;
    if (parseResult.data.id_back_base64) {
      const backUpload = await uploadImage(
        parseResult.data.id_back_base64,
        `csefest/verifications/${user.id}/back`
      );
      backUploadUrl = backUpload.secure_url;
    }

    // 4. Insert or update verification record.
    const { data: existing } = await supabase
      .from("student_verifications")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      const { error: updateError } = await supabase
        .from("student_verifications")
        .update({
          id_front_url: frontUpload.secure_url,
          id_back_url: backUploadUrl,
          status: "pending",
        })
        .eq("user_id", user.id);

      if (updateError) {
        throw new Error(`Failed to update verification: ${updateError.message}`);
      }
    } else {
      // No existing row — safe to insert
      const { error: insertError } = await supabase
        .from("student_verifications")
        .insert({
          user_id: user.id,
          id_front_url: frontUpload.secure_url,
          id_back_url: backUploadUrl,
          status: "pending",
        });

      if (insertError) {
        throw new Error(`Failed to create verification: ${insertError.message}`);
      }
    }

    // Update profile status
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        verification_status: "pending",
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (profileError) {
      throw new Error(profileError.message);
    }

    return NextResponse.json({
      success: true,
      message: "Student ID documents uploaded successfully. Verification status is now pending review.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload operation failed.";
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}
