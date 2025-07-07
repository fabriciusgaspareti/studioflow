"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/login');
    }, [router]);
    
    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <p>Redirecionando...</p>
        </div>
    );
}
