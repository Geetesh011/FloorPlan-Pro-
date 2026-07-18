import { Link } from "react-router-dom";
import { useState } from "react";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from "@/components/landing/ui/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/landing/ui/sheet";
import { buttonVariants } from "@/components/landing/ui/button";
import { Menu } from "lucide-react";
import LogoIcon from "../LogoIcon";

interface RouteProps {
  href: string;
  label: string;
}

const navLinks: RouteProps[] = [
  { href: "#overview", label: "Overview" },
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
];

interface LandingNavbarProps {
  isLoggedIn?: boolean;
}

export const LandingNavbar = ({ isLoggedIn = false }: LandingNavbarProps) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  return (
    <header className="sticky border-b top-0 z-40 w-full bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="w-full h-20 px-4 lg:px-8 flex justify-between items-center relative">
        {/* Logo */}
        <div className="flex">
          <Link to="/" className="font-bold text-xl flex items-center gap-2">
            <LogoIcon className="w-5 h-5 text-green-600" />
            <span>FloorPlan <span className="text-green-600">Pro</span></span>
          </Link>
        </div>

        {/* Mobile */}
        <span className="flex md:hidden">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger className="px-2">
              <Menu className="h-5 w-5" onClick={() => setIsOpen(true)} />
            </SheetTrigger>
            <SheetContent side="left">
              <SheetHeader>
                <SheetTitle className="font-bold text-xl">FloorPlan Pro</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col justify-center items-center gap-4 mt-8">
                {navLinks.map(({ href, label }) => (
                  <a key={label} href={href} onClick={() => setIsOpen(false)} className="text-gray-700 font-medium hover:text-black">
                    {label}
                  </a>
                ))}
                <div className="flex flex-col w-full gap-2 mt-4">
                  {isLoggedIn ? (
                    <Link to="/dashboard" onClick={() => setIsOpen(false)} className="w-full text-center px-6 py-3 rounded-full bg-green-500 text-white font-medium hover:bg-green-600 transition-colors">Get Started</Link>
                  ) : (
                    <>
                      <Link to="/login" onClick={() => setIsOpen(false)} className="w-full text-center px-6 py-3 rounded-full border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-all duration-300 hover:-translate-y-0.5 hover:border-green-400 hover:ring-2 hover:ring-green-400/30 hover:shadow-[0_0_15px_rgba(34,197,94,0.2)]">Sign In</Link>
                      <Link to="/login" onClick={() => setIsOpen(false)} className="w-full text-center px-6 py-3 rounded-full bg-[#1de25b] text-black font-semibold hover:bg-[#1bc650] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_15px_rgba(34,197,94,0.5)] hover:ring-2 hover:ring-green-400/50">Start a project</Link>
                    </>
                  )}
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </span>

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
          {navLinks.map(({ href, label }) => (
            <a key={label} href={href} className="text-[16px] font-medium text-gray-700 hover:text-black transition-colors">
              {label}
            </a>
          ))}
        </nav>

        {/* Desktop auth buttons */}
        <div className="hidden md:flex items-center gap-3">
          {isLoggedIn ? (
            <Link to="/dashboard" className="px-6 py-2.5 rounded bg-green-500 text-white font-bold hover:bg-green-600 transition-colors">
              Get Started
            </Link>
          ) : (
            <>
              <Link to="/login" className="px-6 py-2.5 rounded bg-white border-2 border-green-500 text-green-600 font-bold hover:bg-green-50 transition-colors">
                Sign In
              </Link>
              <Link to="/login" className="px-6 py-2.5 rounded bg-[#1de25b] text-black font-bold hover:bg-[#1bc650] transition-colors shadow-[0_0_15px_rgba(34,197,94,0.3)] hover:shadow-[0_0_20px_rgba(34,197,94,0.6)]">
                Start a project
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
