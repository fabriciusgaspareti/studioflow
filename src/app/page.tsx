"use client";

import { Header } from "@/components/header";
import { TrackList } from "@/components/track-list";
import { useAuth } from "@/hooks/use-auth";

export default function Home() {
  const { isLoggedIn } = useAuth();

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header />
      <main className="flex-1 flex flex-col">
        {isLoggedIn ? (
          <TrackList />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="container relative text-center">
              <h1 className="font-headline text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
                Bem-vindo ao <span className="text-primary">StudioFlow</span>
              </h1>
              <p className="mx-auto max-w-[700px] text-base text-foreground/80 sm:text-lg md:text-xl mt-4">
                Seu player de música pessoal para estudo e prática. Faça login para acessar suas faixas.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
