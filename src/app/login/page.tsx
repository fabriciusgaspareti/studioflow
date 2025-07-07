"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirecionar para home, pois agora usamos popup
    router.replace('/');
  }, [router]);
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <p>Redirecionando...</p>
    </div>
  );
}