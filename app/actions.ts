"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const ADMIN_EMAIL = "admin@example.com";
const ADMIN_PASSWORD = "123456";

export async function login(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
    return { error: "Invalid credentials" };
  }

  const cookieStore = await cookies();
  cookieStore.set("session", "authenticated", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 1 day
  });

  redirect("/dashboard");
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
  redirect("/");
}
