import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { ensureUserAndProfileExists } from "@/lib/server/userSelfHeal";



const profileSchema = z.object({
  full_name: z.string().min(2, "Full Name must be at least 2 characters"),
  phone: z.string().min(10, "Phone number must be valid"),
  gender: z.string().optional().nullable(),
  university: z.string().min(2, "University is required"),
  department: z.string().min(2, "Department is required"),
  semester: z.string().min(1, "Semester is required"),
  student_id: z.string().min(2, "Student ID is required"),
  tshirt_size: z.string().min(1, "T-shirt size is required"),
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

    // Self-healing: Ensure user exists in public tables before profile operations
    await ensureUserAndProfileExists(supabase, user);

    // 1b. Rate limit: 20 profile saves per minute per user
    const { success: withinLimit } = checkRateLimit(`profile:${user.id}`, {
      limit: 20,
      windowMs: 60_000,
    });
    if (!withinLimit) {
      return NextResponse.json(
        { success: false, message: "Too many requests. Please wait a moment before saving again." },
        { status: 429 }
      );
    }

    // 2. Validate request body
    const body = await req.json();
    const parseResult = profileSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: parseResult.error.issues[0]?.message || "Validation failed",
        },
        { status: 400 }
      );
    }

    // 3. Update profile row — mark profile_complete = true so participant gains full portal access
    // Set verification_status = "verified" immediately since we are bypassing file uploads on Vercel deployment
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: parseResult.data.full_name,
        phone: parseResult.data.phone,
        gender: parseResult.data.gender || null,
        university: parseResult.data.university,
        department: parseResult.data.department,
        semester: parseResult.data.semester,
        student_id: parseResult.data.student_id,
        tshirt_size: parseResult.data.tshirt_size,
        profile_complete: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully.",
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Internal server error.";
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabase = await createClient();

    // Authenticate user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized access." },
        { status: 401 }
      );
    }

    // Self-healing: Ensure user exists in public tables before profile operations
    await ensureUserAndProfileExists(supabase, user);

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      success: true,
      data: profile,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Internal server error.";
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}
