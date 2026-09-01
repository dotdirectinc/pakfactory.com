function wwwOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_WWW_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

export function adminWwwHrefs() {
  const www = wwwOrigin();
  return {
    forgotPassword: `${www}/forgot-password`,
    signUp: `${www}/sign-up`,
    terms: `${www}/policies/terms-of-service`,
    privacy: `${www}/policies/privacy-policy`,
  };
}
