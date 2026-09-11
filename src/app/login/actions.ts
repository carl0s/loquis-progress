"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, createSession, roleForPassword } from "@/lib/auth";

export async function login(formData: FormData) {
  const role = await roleForPassword(String(formData.get("password") ?? ""));
  if (!role) {
    // Slow down guessing.
    await new Promise((resolve) => setTimeout(resolve, 700));
    redirect("/login?errore=1");
  }
  const session = await createSession(role);
  (await cookies()).set(SESSION_COOKIE, session.value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: session.maxAge,
  });
  redirect(role === "owner" ? "/" : "/cliente");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
