export function Footer() {
  return (
    <footer className="border-t bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <div className="container flex h-10 items-center justify-center m-auto px-4 sm:px-6">
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} huangmizhou. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
