import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Custom signup endpoint that auto-confirms users (no email verification needed)
export async function POST(req: Request) {
  try {
    const { email, password, displayName } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "אימייל וסיסמה נדרשים" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "סיסמה חייבת להכיל לפחות 6 תווים" }, { status: 400 });
    }

    const supabase = getAdminSupabase();

    // Create user with auto-confirm using admin API
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm, no verification email needed
      user_metadata: { display_name: displayName || "" },
    });

    if (error) {
      if (error.message.includes("already been registered") || error.message.includes("already exists")) {
        return NextResponse.json({ error: "אימייל זה כבר רשום. נסה להתחבר." }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, userId: data.user.id });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
