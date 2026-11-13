import { Link } from "@tanstack/react-router";

import { SocialLinks } from "./SocialIcons";

export function SiteFooter() {
  return (
    <footer className="mx-auto mt-16 w-full max-w-[1120px] px-4 pb-10 sm:px-6">
      <div className="grid items-center gap-6 md:grid-cols-[1fr_auto_1fr]">
        <div className="hidden md:block" />
        <div className="text-center">
          <nav className="flex flex-wrap justify-center gap-x-7 gap-y-2 text-sm font-medium">
            <Link to="/contact" className="hover:text-lime">Contact</Link>
            <Link to="/privacy" className="hover:text-lime">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-lime">Terms &amp; Conditions</Link>
          </nav>
          <p className="mt-3 text-xs text-foreground/90">
            Copyright © 2026 <span className="font-semibold">Zentra</span>&nbsp;&nbsp;All Rights Reserved.
          </p>
        </div>
        <div className="flex justify-center md:justify-end">
          <SocialLinks />
        </div>
      </div>
    </footer>
  );
}
